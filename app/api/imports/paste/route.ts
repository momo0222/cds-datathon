// =============================================================
// POST /api/imports/paste
// Person B — Smart Upload + Extraction
//
// Refactored from app/api/ai/import-email/route.ts.
// Key change: instead of inserting directly into itinerary_items,
// proposals are saved to proposed_trip_changes (Person A's table)
// for user review. Person A's approval endpoint then writes the
// approved proposals into itinerary_items.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askAIJSON } from "@/lib/ai";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { ProposedTripChange } from "@/lib/types";

// Same input shape as the old import-email route.
const requestSchema = z.object({
  trip_id: z.string().uuid(),
  email_subject: z.string().optional().default(""),
  email_body: z.string().min(1),
  default_currency: z.string().optional().default("USD"),
});

// Kept exactly from the old route — the extraction prompt is already solid.
const SYSTEM_PROMPT = `You are an expert travel itinerary email parser.

Goal:
- Convert a raw travel confirmation email (flight, hotel, activity, restaurant, train/bus) into a STRICT JSON object that can be inserted into a travel planning database.

Hard requirements:
- Output MUST be valid JSON (no markdown, no code fences).
- Output MUST match the schema described below.
- If information is missing, use null for unknown scalar fields and [] for lists.
- Do not hallucinate booking references, addresses, times, or prices.
- Use 24-hour time format HH:MM when time is known. Otherwise null.
- Dates must be YYYY-MM-DD when known.

JSON schema to output:
{
  "items": [
    {
      "day_date": "YYYY-MM-DD" | null,
      "type": "flight" | "hotel" | "transport" | "activity" | "restaurant",
      "status": "confirmed",
      "title": string,
      "detail": string | null,
      "time": "HH:MM" | null,
      "end_time": "HH:MM" | null,
      "location_name": string | null,
      "latitude": number | null,
      "longitude": number | null,
      "booking_ref": string | null,
      "booking_url": string | null,
      "cost": number,
      "currency": string,
      "notes": string | null
    }
  ]
}

Interpretation rules:
- For flights: title like "DL173 JFK → NRT"; detail may include airline, terminals, seat, baggage.
- For hotels: title hotel name; detail include check-in/out dates + address if present.
- For activities/restaurants: title venue/activity; detail include reservation name/party size when present.
- If multiple segments exist (e.g. outbound + return), output multiple items.
- If email has multiple unrelated confirmations, output multiple items.
`;

// Shape the AI returns — same as before.
type AIOut = {
  items: Array<{
    day_date: string | null;
    type: "flight" | "hotel" | "transport" | "activity" | "restaurant";
    status: "confirmed";
    title: string;
    detail: string | null;
    time: string | null;
    end_time: string | null;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    booking_ref: string | null;
    booking_url: string | null;
    cost: number;
    currency: string;
    notes: string | null;
  }>;
};

export async function POST(request: NextRequest) {
  // --- Auth check ---
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Validate request body ---
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trip_id, email_subject, email_body, default_currency } = parsed.data;

  // --- Call AI --- (same call as the old route)
  const prompt = `Trip ID: ${trip_id}\nDefault currency: ${default_currency}\n\nEmail subject:\n${email_subject}\n\nEmail body:\n${email_body}`;

  const ai = await askAIJSON<AIOut>({
    system: SYSTEM_PROMPT,
    prompt,
    model: "full",
    temperature: 0,
    maxTokens: 1800,
  });

  const admin = createAdminSupabase();

  // --- Create an import job to track this attempt ---
  // Inserted before proposals so we have an id to link them to.
  // Status is "needs_review" because AI extraction is already done at this point.
  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      trip_id,
      user_id: user.id,
      source: "paste",
      status: "needs_review",
      source_ref: email_subject || null,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create import job" }, { status: 500 });
  }

  // --- Map AI output to ProposedTripChange[] ---
  // confidence: 0.9 baseline for pasted text — clean input, extraction is reliable.
  // warnings flag anything the user should double-check before approving.
  const proposals: ProposedTripChange[] = ai.items.map((item) => {
    const warnings: string[] = [];

    // Flag missing date so user knows to assign it manually in the review UI.
    if (!item.day_date) {
      warnings.push("No date found — assign manually");
    }

    // Flag missing price so user knows the cost field needs filling in.
    if (!item.cost || item.cost === 0) {
      warnings.push("No price found");
    }

    return {
      trip_id,
      source: "paste",
      source_ref: email_subject || null,
      type: item.type,
      title: item.title,
      detail: item.detail,
      day_date: item.day_date,
      time: item.time,
      end_time: item.end_time,
      location_name: item.location_name,
      booking_ref: item.booking_ref,
      booking_url: item.booking_url,
      cost: item.cost ?? 0,
      currency: item.currency || default_currency,
      notes: item.notes,
      confidence: 0.9,
      warnings,
      action: "create",
      target_item_id: null,
    };
  });

  // --- Insert all proposals into proposed_trip_changes in one call ---
  // payload holds the full proposal object — Person A's table stores it as jsonb.
  // Returning the DB rows (not local objects) so Person C gets the real id
  // assigned by Supabase, which they need to call the approval endpoint later.
  const { data: saved, error: proposalError } = await admin
    .from("proposed_trip_changes")
    .insert(
      proposals.map((p) => ({
        trip_id,
        import_job_id: job.id,
        created_by: user.id,
        source: p.source,
        action: p.action,
        status: "pending",
        payload: p,
        confidence: p.confidence,
        warnings: p.warnings,
      }))
    )
    .select("*");

  if (proposalError || !saved) {
    return NextResponse.json({ error: "Failed to save proposals" }, { status: 500 });
  }

  // Return saved DB rows — same { proposals } shape Person C expects,
  // but now each item has a real id for the approval endpoint.
  return NextResponse.json({ proposals: saved });
}
