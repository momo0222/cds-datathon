// =============================================================
// POST /api/imports/upload
// Person B — Smart Upload + Extraction
//
// Accepts a multipart file upload, extracts travel data using AI,
// and saves proposals to proposed_trip_changes for user review.
// Person A's approval endpoint then writes approved proposals
// into itinerary_items.
//
// Supported now:  .txt, .html, .png, .jpg, .webp (AI vision)
// Coming next:    .pdf
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { askAIJSON, askAIVision } from "@/lib/ai";
import { ProposedTripChange } from "@/lib/types";

const ALLOWED_TYPES = [
  "text/plain",
  "text/html",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// 10 MB cap — large enough for real booking PDFs, small enough to avoid abuse.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Same prompt as the paste route — AI reads normalized text regardless of source.
const SYSTEM_PROMPT = `You are an expert travel itinerary parser.

Goal:
- Convert raw travel confirmation content (flight, hotel, activity, restaurant, train/bus) into a STRICT JSON object that can be inserted into a travel planning database.

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
      "title": string,
      "detail": string | null,
      "time": "HH:MM" | null,
      "end_time": "HH:MM" | null,
      "location_name": string | null,
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
`;

type AIOut = {
  items: Array<{
    day_date: string | null;
    type: "flight" | "hotel" | "transport" | "activity" | "restaurant";
    title: string;
    detail: string | null;
    time: string | null;
    end_time: string | null;
    location_name: string | null;
    booking_ref: string | null;
    booking_url: string | null;
    cost: number;
    currency: string;
    notes: string | null;
  }>;
};

// Strips HTML tags and collapses whitespace so the AI gets clean readable text.
// Raw HTML sent directly to the AI produces noisy, unreliable extractions.
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  // --- Auth check ---
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse multipart form data ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 }
    );
  }

  // --- Validate trip_id ---
  const trip_id = formData.get("trip_id");
  if (!trip_id || typeof trip_id !== "string" || !UUID_REGEX.test(trip_id)) {
    return NextResponse.json(
      { error: "Missing or invalid trip_id" },
      { status: 400 }
    );
  }

  const default_currency =
    typeof formData.get("default_currency") === "string"
      ? (formData.get("default_currency") as string)
      : "USD";

  // --- Validate file ---
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Accepted: .txt, .html, .pdf, .png, .jpg, .webp`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

    // --- Extract and call AI based on file type ---
  const basePrompt = `Trip ID: ${trip_id}\nDefault currency: ${default_currency}\nFile name: ${file.name}`;

  let ai: AIOut;
  let confidence: number;

  const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

  if (file.type === "text/plain") {
    const extractedText = await file.text();
    if (!extractedText.trim()) {
      return NextResponse.json({ error: "File appears to be empty." }, { status: 400 });
    }
    ai = await askAIJSON<AIOut>({
      system: SYSTEM_PROMPT,
      prompt: `${basePrompt}\n\nContent:\n${extractedText}`,
      model: "full",
      temperature: 0,
      maxTokens: 1800,
    });
    confidence = 0.85;

  } else if (file.type === "text/html") {
    // Strip tags so the AI gets clean readable text instead of raw markup.
    const extractedText = stripHtml(await file.text());
    if (!extractedText.trim()) {
      return NextResponse.json({ error: "Could not extract any text from this HTML file." }, { status: 400 });
    }
    ai = await askAIJSON<AIOut>({
      system: SYSTEM_PROMPT,
      prompt: `${basePrompt}\n\nContent:\n${extractedText}`,
      model: "full",
      temperature: 0,
      maxTokens: 1800,
    });
    confidence = 0.85;

  } else if (file.type === "application/pdf") {
    return NextResponse.json(
      { error: "PDF extraction coming soon — try pasting the text instead." },
      { status: 400 }
    );

  } else if (IMAGE_TYPES.includes(file.type)) {
    // Convert image to base64 so OpenAI vision can read it directly.
    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    ai = await askAIVision<AIOut>({
      system: SYSTEM_PROMPT,
      prompt: `${basePrompt}\n\nExtract all travel confirmation details visible in this image.`,
      imageBase64,
      mimeType: file.type,
      model: "full",
      temperature: 0,
      maxTokens: 1800,
    });
    // Slightly lower confidence — images may be partially cropped or blurry.
    confidence = 0.8;

  } else {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  // --- Map AI output to ProposedTripChange[] ---
  const proposals: ProposedTripChange[] = ai.items.map((item) => {
    const warnings: string[] = [];

    if (!item.day_date) warnings.push("No date found — assign manually");
    if (!item.cost || item.cost === 0) warnings.push("No price found");

    return {
      trip_id,
      source: "upload",
      source_ref: file.name,
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
      confidence,
      warnings,
      action: "create",
      target_item_id: null,
    };
  });

  const admin = createAdminSupabase();

  // --- Create an import job to track this upload attempt ---
  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      trip_id,
      user_id: user.id,
      source: "upload",
      status: "needs_review",
      source_ref: file.name,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: "Failed to create import job" },
      { status: 500 }
    );
  }

  // --- Insert all proposals into proposed_trip_changes in one call ---
  // payload holds the full proposal object as jsonb.
  // Returning DB rows so Person C gets the real id for the approval endpoint.
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
    return NextResponse.json(
      { error: "Failed to save proposals" },
      { status: 500 }
    );
  }

  // Return saved DB rows — Person C reads this shape to build the review UI.
  return NextResponse.json({ proposals: saved });
}
