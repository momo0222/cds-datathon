import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askAIJSON } from "@/lib/ai";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

const requestSchema = z.object({
  trip_id: z.string().uuid(),
  email_subject: z.string().optional().default(""),
  email_body: z.string().min(1),
  default_currency: z.string().optional().default("USD"),
});

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

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trip_id, email_subject, email_body, default_currency } = parsed.data;

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

  const prompt = `Trip ID: ${trip_id}\nDefault currency: ${default_currency}\n\nEmail subject:\n${email_subject}\n\nEmail body:\n${email_body}`;

  const ai = await askAIJSON<AIOut>({
    system: SYSTEM_PROMPT,
    prompt,
    model: "full",
    temperature: 0,
    maxTokens: 1800,
  });

  const dayDates = Array.from(
    new Set(ai.items.map((i) => i.day_date).filter((d): d is string => Boolean(d)))
  );

  const admin = createAdminSupabase();

  const { data: days, error: daysError } = await admin
    .from("days")
    .select("*")
    .eq("trip_id", trip_id)
    .order("date", { ascending: true });

  if (daysError) {
    return NextResponse.json({ error: daysError.message }, { status: 400 });
  }

  const dayIdByDate = new Map<string, string>();
  (days ?? []).forEach((d: any) => dayIdByDate.set(d.date, d.id));

  for (const date of dayDates) {
    if (!dayIdByDate.has(date)) {
      const { data: newDay, error: newDayError } = await admin
        .from("days")
        .insert({
          trip_id,
          date,
          label: null,
          sort_order: (days ?? []).length,
        })
        .select("*")
        .single();
      if (newDayError) {
        return NextResponse.json({ error: newDayError.message }, { status: 400 });
      }
      dayIdByDate.set((newDay as any).date, (newDay as any).id);
      (days ?? []).push(newDay as any);
    }
  }

  const itemsToInsert = ai.items
    .map((i, idx) => {
      const day_id = i.day_date ? dayIdByDate.get(i.day_date) : undefined;
      if (!day_id) return null;
      return {
        day_id,
        trip_id,
        type: i.type,
        status: i.status,
        title: i.title,
        detail: i.detail,
        time: i.time,
        end_time: i.end_time,
        location_name: i.location_name,
        latitude: i.latitude,
        longitude: i.longitude,
        booking_ref: i.booking_ref,
        booking_url: i.booking_url,
        cost: i.cost ?? 0,
        currency: i.currency || default_currency,
        notes: i.notes,
        added_by: user.id,
        sort_order: idx,
      };
    })
    .filter(Boolean);

  if (itemsToInsert.length === 0) {
    return NextResponse.json({ created: 0, items: [] });
  }

  const { data: createdItems, error: insertError } = await admin
    .from("itinerary_items")
    .insert(itemsToInsert as any[])
    .select("*");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ created: createdItems?.length ?? 0, items: createdItems ?? [] });
}
