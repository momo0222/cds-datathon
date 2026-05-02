import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole, canEdit } from "@/lib/check-role";

const createItemSchema = z.object({
  trip_id: z.string().uuid(),
  type: z.enum(["flight", "hotel", "transport", "activity", "restaurant"]),
  status: z.enum(["confirmed", "pending", "suggestion", "cancelled"]).optional(),
  title: z.string().min(1),
  detail: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  location_name: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  booking_ref: z.string().nullable().optional(),
  booking_url: z.string().nullable().optional(),
  cost: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ dayId: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: items, error } = await admin
    .from("itinerary_items")
    .select("*")
    .eq("day_id", params.dayId)
    .order("sort_order", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: items ?? [] });
}

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ dayId: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = userData.user.id;
  const b = parsed.data;

  const role = await getTripRole(b.trip_id, userId);
  if (!canEdit(role)) {
    return NextResponse.json({ error: "Viewers cannot add items" }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const { data: item, error } = await admin
    .from("itinerary_items")
    .insert({
      day_id: params.dayId,
      trip_id: b.trip_id,
      type: b.type,
      status: b.status ?? "suggestion",
      title: b.title,
      detail: b.detail ?? null,
      time: b.time ?? null,
      end_time: b.end_time ?? null,
      location_name: b.location_name ?? null,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      booking_ref: b.booking_ref ?? null,
      booking_url: b.booking_url ?? null,
      cost: b.cost ?? 0,
      currency: b.currency ?? "USD",
      notes: b.notes ?? null,
      added_by: userId,
      sort_order: b.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
