import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { rankTripsForEmail } from "@/lib/trip-match";

const matchSchema = z.object({
  subject: z.string().nullable().optional(),
  from: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = matchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: memberRows, error: memberError } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", userData.user.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  const memberTripIds = (memberRows ?? []).map((row) => row.trip_id).filter(Boolean);
  const ownedTripsQuery = admin
    .from("trips")
    .select("id,name,destination,start_date,end_date")
    .eq("owner_id", userData.user.id);

  const memberTripsQuery = memberTripIds.length > 0
    ? admin.from("trips").select("id,name,destination,start_date,end_date").in("id", memberTripIds)
    : null;

  const [{ data: ownedTrips, error: ownedError }, memberResult] = await Promise.all([
    ownedTripsQuery,
    memberTripsQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 400 });
  }
  if (memberResult.error) {
    return NextResponse.json({ error: memberResult.error.message }, { status: 400 });
  }

  const trips = Array.from(
    new Map([...(ownedTrips ?? []), ...(memberResult.data ?? [])].map((trip) => [trip.id, trip])).values()
  );

  const matches = rankTripsForEmail(parsed.data, trips);
  return NextResponse.json({ matches });
}
