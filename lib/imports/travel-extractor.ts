import { askAIJSON } from "@/lib/ai";
import { ProposalSource, ProposedTripChange } from "@/lib/types";

const SYSTEM_PROMPT = `You are an expert travel itinerary email parser.

Goal:
- Convert raw travel confirmation content (flight, hotel, activity, restaurant, train/bus) into a STRICT JSON object for a travel planning database.

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
- For flights: title like "DL173 JFK -> NRT"; detail may include airline, terminals, seat, baggage.
- For hotels: title hotel name; detail include check-in/out dates + address if present.
- For activities/restaurants: title venue/activity; detail include reservation name/party size when present.
- If multiple segments exist (e.g. outbound + return), output multiple items.
- If email has multiple unrelated confirmations, output multiple items.
`;

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

export interface ExtractTravelProposalsInput {
  tripId: string;
  source: ProposalSource;
  subject?: string | null;
  body: string;
  defaultCurrency?: string;
  sourceRef?: string | null;
  baseConfidence?: number;
  extraWarnings?: string[];
}

export async function extractTravelProposals(input: ExtractTravelProposalsInput) {
  const defaultCurrency = input.defaultCurrency ?? "USD";
  const prompt = [
    `Trip ID: ${input.tripId}`,
    `Default currency: ${defaultCurrency}`,
    "",
    "Subject:",
    input.subject ?? "",
    "",
    "Confirmation content:",
    input.body,
  ].join("\n");

  const ai = await askAIJSON<AIOut>({
    system: SYSTEM_PROMPT,
    prompt,
    model: "full",
    temperature: 0,
    maxTokens: 1800,
  });

  return ai.items.map((item) => {
    const warnings = [...(input.extraWarnings ?? [])];
    if (!item.day_date) warnings.push("No date found - assign manually");
    if (!item.cost || item.cost === 0) warnings.push("No price found");

    return {
      trip_id: input.tripId,
      source: input.source,
      source_ref: input.sourceRef ?? input.subject ?? null,
      type: item.type,
      title: item.title,
      detail: item.detail,
      day_date: item.day_date,
      time: item.time,
      end_time: item.end_time,
      location_name: item.location_name,
      latitude: item.latitude,
      longitude: item.longitude,
      booking_ref: item.booking_ref,
      booking_url: item.booking_url,
      cost: item.cost ?? 0,
      currency: item.currency || defaultCurrency,
      notes: item.notes,
      confidence: input.baseConfidence ?? 0.85,
      warnings,
      action: "create",
      target_item_id: null,
    } satisfies ProposedTripChange;
  });
}
