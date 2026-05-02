import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole, canEdit } from "@/lib/check-role";

const updateTripSchema = z.object({
  name: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  cover_emoji: z.string().optional(),
  color: z.string().optional(),
  start_date: z.string().min(1).optional(),
  end_date: z.string().min(1).optional(),
  total_budget: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
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
  const { data: trip, error } = await admin
    .from("trips")
    .select(
      "*, days(*, items:itinerary_items(*)), members:trip_members(*, profile:profiles!user_id(*))"
    )
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ trip });
}

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
  const parsed = updateTripSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates = parsed.data;
  const role = await getTripRole(params.id, userData.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Viewers cannot edit trips" }, { status: 403 });

  const admin = createAdminSupabase();
  const { data: trip, error } = await admin
    .from("trips")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ trip });
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

  const role = await getTripRole(params.id, userData.user.id);
  if (role !== "owner") return NextResponse.json({ error: "Only the owner can delete a trip" }, { status: 403 });

  const admin = createAdminSupabase();
  const { error } = await admin.from("trips").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
