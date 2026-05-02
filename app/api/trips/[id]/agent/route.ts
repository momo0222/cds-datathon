// =============================================================
// POST /api/trips/[id]/agent
// Person B — Smart Upload + Extraction
//
// Trip agent: reads the current itinerary and a natural language
// command, then proposes changes as ProposedTripChange[].
// Nothing writes to itinerary_items here — Person C's review
// panel shows proposals first, Person A's approval endpoint
// writes the approved ones.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askAIJSON } from "@/lib/ai";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { ProposedTripChange, ItemType } from "@/lib/types";

const requestSchema = z.object({
  message: z.string().min(1),
  trip: z.object({
    id: z.string(),
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    currency: z.string().optional().default("USD"),
    total_budget: z.number().optional(),
    days: z
      .array(
        z.object({
          id: z.string(),
          date: z.string(),
          label: z.string().nullable().optional(),
          items: z
            .array(
              z.object({
                id: z.string(),
                type: z.string(),
                title: z.string(),
                time: z.string().nullable().optional(),
                end_time: z.string().nullable().optional(),
                location_name: z.string().nullable().optional(),
                cost: z.number().optional(),
                currency: z.string().optional(),
              })
            )
            .optional()
            .default([]),
        })
      )
      .optional()
      .default([]),
  }),
});

const SYSTEM_PROMPT = `You are a trip planning agent embedded in a travel app.

You are given a user's current itinerary and a natural language command. Your job is to propose changes to the itinerary as structured JSON.

Rules:
- You MUST output valid JSON only — no markdown, no code fences.
- Never mutate the itinerary directly. Only return proposals.
- Proposals can be: create (add new item), update (change an existing item), move (change the day/time of an existing item), delete (remove an existing item).
- For update/move/delete, always include target_item_id (the id of the existing item).
- For create, target_item_id should be null.
- Use 24-hour HH:MM for times. Use YYYY-MM-DD for dates.
- Keep titles concise.
- Confidence should reflect how certain you are that this change matches the user's intent (0.0 to 1.0).
- Warnings should flag anything ambiguous or risky about the proposal.

JSON schema to output:
{
  "proposals": [
    {
      "action": "create" | "update" | "move" | "delete",
      "target_item_id": string | null,
      "type": "flight" | "hotel" | "transport" | "activity" | "restaurant",
      "title": string,
      "detail": string | null,
      "day_date": "YYYY-MM-DD" | null,
      "time": "HH:MM" | null,
      "end_time": "HH:MM" | null,
      "location_name": string | null,
      "cost": number,
      "currency": string,
      "notes": string | null,
      "confidence": number,
      "warnings": string[]
    }
  ]
}`;

type AIProposal = {
  action: "create" | "update" | "move" | "delete";
  target_item_id: string | null;
  type: ItemType;
  title: string;
  detail: string | null;
  day_date: string | null;
  time: string | null;
  end_time: string | null;
  location_name: string | null;
  cost: number;
  currency: string;
  notes: string | null;
  confidence: number;
  warnings: string[];
};

type AIOut = { proposals: AIProposal[] };

// Serializes the itinerary into a readable block for the AI prompt.
// Structured text is more reliable than passing raw JSON to the model.
function serializeItinerary(trip: z.infer<typeof requestSchema>["trip"]): string {
  if (!trip.days?.length) return "No itinerary items yet.";

  return trip.days
    .map((day) => {
      const itemLines = (day.items ?? [])
        .map((item) => {
          const time = item.time ? ` at ${item.time}` : "";
          const cost = item.cost ? ` ($${item.cost} ${item.currency ?? ""})`.trim() : "";
          return `  - [${item.id}] ${item.type}: ${item.title}${time}${cost}`;
        })
        .join("\n");
      return `${day.date} (${day.label ?? "Day"}):\n${itemLines || "  (no items)"}`;
    })
    .join("\n\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // --- Auth check ---
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;

  // --- Validate request body ---
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { message, trip } = parsed.data;

  // --- Build prompt ---
  // Itinerary is serialized as readable text so the AI can reference item ids
  // when proposing update/move/delete actions.
  const itinerary = serializeItinerary(trip);
  const prompt = `Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Budget: ${trip.total_budget ?? "unspecified"} ${trip.currency}

Current itinerary:
${itinerary}

User command: "${message}"`;

  // --- Call AI ---
  let ai: AIOut;
  try {
    ai = await askAIJSON<AIOut>({
      system: SYSTEM_PROMPT,
      prompt,
      model: "full",
      temperature: 0.4,
      maxTokens: 2000,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "AI generation failed" },
      { status: 500 }
    );
  }

  // --- Map AI output to ProposedTripChange[] ---
  // Agent suggestions get slightly lower baseline confidence (0.75) than
  // paste/upload (0.85-0.9) since they come from vague natural language.
  // The AI sets its own confidence per proposal; we clamp to [0, 1].
  const proposals: ProposedTripChange[] = (ai.proposals ?? []).map((p) => ({
    trip_id: tripId,
    source: "agent",
    action: p.action,
    target_item_id: p.target_item_id ?? null,
    type: p.type,
    title: p.title,
    detail: p.detail,
    day_date: p.day_date,
    time: p.time,
    end_time: p.end_time,
    location_name: p.location_name,
    cost: p.cost ?? 0,
    currency: p.currency || trip.currency,
    notes: p.notes,
    confidence: Math.min(1, Math.max(0, p.confidence ?? 0.75)),
    warnings: p.warnings ?? [],
  }));

  const admin = createAdminSupabase();

  // --- Create an import job to track this agent request ---
  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      trip_id: tripId,
      user_id: user.id,
      source: "agent",
      status: "needs_review",
      source_ref: message,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create import job" }, { status: 500 });
  }

  // --- Save proposals to DB so they get real UUIDs ---
  // Without real ids, Person C's approve endpoint gets fake ids and returns "Proposal not found".
  const { data: saved, error: proposalError } = await admin
    .from("proposed_trip_changes")
    .insert(
      proposals.map((p) => ({
        trip_id: tripId,
        import_job_id: job.id,
        created_by: user.id,
        source: p.source,
        action: p.action,
        target_item_id: p.target_item_id ?? null,
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

  // Return saved DB rows — each has a real id Person C can use for approve/reject.
  return NextResponse.json({ proposals: saved });
}
