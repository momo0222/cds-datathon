import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole, canEdit } from "@/lib/check-role";

const updateItemSchema = z.object({
  type: z.enum(["flight", "hotel", "transport", "activity", "restaurant"]).optional(),
  status: z.enum(["confirmed", "pending", "suggestion", "cancelled"]).optional(),
  title: z.string().min(1).optional(),
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

export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateItemSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Look up trip_id for role check
  const { data: existing } = await admin.from("itinerary_items").select("trip_id").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const role = await getTripRole(existing.trip_id, userData.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Viewers cannot edit items" }, { status: 403 });

  const { data: item, error } = await admin
    .from("itinerary_items")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  // Look up trip_id for role check
  const { data: existing } = await admin.from("itinerary_items").select("trip_id").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const role = await getTripRole(existing.trip_id, userData.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Viewers cannot delete items" }, { status: 403 });

  const { error } = await admin
    .from("itinerary_items")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
