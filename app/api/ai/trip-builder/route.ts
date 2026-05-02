import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askAIJSON } from "@/lib/ai";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

const requestSchema = z.object({
  name: z.string().min(1),
  destination: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  currency: z.string().optional().default("USD"),
  budget: z.number().optional(),
  travelers: z.number().int().optional().default(2),
  preferences: z.string().optional().default(""),
});

const SYSTEM_PROMPT = `You are a senior travel planner.

Goal:
- Given a user prompt and trip constraints, generate a complete day-by-day itinerary as STRICT JSON suitable for insertion into a travel planning database.

Hard requirements:
- Output MUST be valid JSON (no markdown, no code fences).
- Output MUST match the schema described below.
- Do not hallucinate exact addresses, booking references, or prices.
- Provide realistic time ordering for each day; use 24-hour time HH:MM.
- Use "suggestion" status for non-booked items.
- Keep titles concise.

JSON schema to output:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": string | null,
      "items": [
        {
          "type": "flight" | "hotel" | "transport" | "activity" | "restaurant",
          "status": "suggestion" | "pending" | "confirmed",
          "title": string,
          "detail": string | null,
          "time": "HH:MM" | null,
          "end_time": "HH:MM" | null,
          "location_name": string | null,
          "latitude": number | null,
          "longitude": number | null,
          "booking_ref": null,
          "booking_url": string | null,
          "cost": number,
          "currency": string,
          "notes": string | null
        }
      ]
    }
  ]
}

Interpretation rules:
- Generate 3-7 items per day.
- Include at least one food-related item per day (restaurant or snack).
- Include transit items when moving between areas.
- Flights/hotels can be included as suggestions only if user asked; otherwise focus on activities/food.
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

  const b = parsed.data;

  type AIOut = {
    days: Array<{
      date: string;
      label: string | null;
      items: Array<{
        type: "flight" | "hotel" | "transport" | "activity" | "restaurant";
        status: "suggestion" | "pending" | "confirmed";
        title: string;
        detail: string | null;
        time: string | null;
        end_time: string | null;
        location_name: string | null;
        latitude: number | null;
        longitude: number | null;
        booking_ref: null;
        booking_url: string | null;
        cost: number;
        currency: string;
        notes: string | null;
      }>;
    }>;
  };

  const prompt = `Trip name: ${b.name}\nDestination: ${b.destination}\nDates: ${b.start_date} to ${b.end_date}\nTravelers: ${b.travelers}\nBudget: ${b.budget ?? "unspecified"} ${b.currency}\nPreferences: ${b.preferences}`;

  let ai: AIOut;
  try {
    ai = await askAIJSON<AIOut>({
      system: SYSTEM_PROMPT,
      prompt,
      model: "full",
      temperature: 0.4,
      maxTokens: 8000,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({
      owner_id: user.id,
      name: b.name,
      destination: b.destination,
      start_date: b.start_date,
      end_date: b.end_date,
      total_budget: b.budget ?? 0,
      currency: b.currency,
      notes: null,
    })
    .select("*")
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 400 });
  }

  const { error: memberError } = await admin.from("trip_members").insert({
    trip_id: (trip as any).id,
    user_id: user.id,
    role: "owner",
    invited_by: null,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  const dayRows = ai.days.map((d, idx) => ({
    trip_id: (trip as any).id,
    date: d.date,
    label: d.label,
    sort_order: idx,
  }));

  const { data: createdDays, error: daysError } = await admin
    .from("days")
    .insert(dayRows)
    .select("*");

  if (daysError) {
    return NextResponse.json({ error: daysError.message }, { status: 400 });
  }

  const dayIdByDate = new Map<string, string>();
  (createdDays ?? []).forEach((d: any) => dayIdByDate.set(d.date, d.id));

  const itemsToInsert = ai.days.flatMap((d) => {
    const day_id = dayIdByDate.get(d.date);
    if (!day_id) return [];
    return d.items.map((i, idx) => ({
      day_id,
      trip_id: (trip as any).id,
      type: i.type,
      status: i.status,
      title: i.title,
      detail: i.detail,
      time: i.time,
      end_time: i.end_time,
      location_name: i.location_name,
      latitude: i.latitude,
      longitude: i.longitude,
      booking_ref: null,
      booking_url: i.booking_url,
      cost: i.cost ?? 0,
      currency: i.currency || b.currency,
      notes: i.notes,
      added_by: user.id,
      sort_order: idx,
    }));
  });

  const { data: createdItems, error: itemsError } = await admin
    .from("itinerary_items")
    .insert(itemsToInsert)
    .select("*");

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({
    trip,
    days: createdDays ?? [],
    items: createdItems ?? [],
  });
}
