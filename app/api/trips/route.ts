import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

const createTripSchema = z.object({
  name: z.string().min(1),
  destination: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  cover_emoji: z.string().optional(),
  color: z.string().optional(),
  total_budget: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().nullable().optional(),
  create_days: z.boolean().optional().default(true),
});

function enumerateDatesInclusive(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  const dates: string[] = [];
  for (let d = s; d <= e; d = addDays(d, 1)) {
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  const { data: memberRows, error: memberError } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", user.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  const memberTripIds = (memberRows ?? []).map(r => r.trip_id).filter(Boolean);

  const { data: ownedTrips, error: ownedError } = await admin
    .from("trips")
    .select("*, members:trip_members(*, profile:profiles(*))")
    .eq("owner_id", user.id)
    .order("start_date", { ascending: false });

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 400 });
  }

  let memberTrips: unknown[] = [];
  if (memberTripIds.length > 0) {
    const { data: memberTripsData, error: memberTripsError } = await admin
      .from("trips")
      .select("*, members:trip_members(*, profile:profiles(*))")
      .in("id", memberTripIds)
      .order("start_date", { ascending: false });
    if (memberTripsError) {
      return NextResponse.json({ error: memberTripsError.message }, { status: 400 });
    }
    memberTrips = memberTripsData ?? [];
  }

  const merged = [...(ownedTrips ?? []), ...(memberTrips as any[])];
  const deduped = Array.from(new Map(merged.map(t => [(t as any).id, t])).values());

  return NextResponse.json({ trips: deduped });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createTripSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  const admin = createAdminSupabase();

  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({
      owner_id: user.id,
      name: body.name,
      destination: body.destination,
      start_date: body.start_date,
      end_date: body.end_date,
      cover_emoji: body.cover_emoji,
      color: body.color,
      total_budget: body.total_budget,
      currency: body.currency,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 400 });
  }

  const { error: memberError } = await admin.from("trip_members").insert({
    trip_id: trip.id,
    user_id: user.id,
    role: "owner",
    invited_by: null,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  if (body.create_days) {
    const dates = enumerateDatesInclusive(body.start_date, body.end_date);
    const daysToInsert = dates.map((date, idx) => ({
      trip_id: trip.id,
      date,
      sort_order: idx,
      label: null,
    }));

    const { error: daysError } = await admin.from("days").insert(daysToInsert);
    if (daysError) {
      return NextResponse.json({ error: daysError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ trip }, { status: 201 });
}
