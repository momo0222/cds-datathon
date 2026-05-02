import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole, canEdit } from "@/lib/check-role";

const createDaySchema = z.object({
  date: z.string().min(1),
  label: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
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
  const { data: days, error } = await admin
    .from("days")
    .select("*, items:itinerary_items(*)")
    .eq("trip_id", params.id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ days: days ?? [] });
}

export async function POST(
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
  const parsed = createDaySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const role = await getTripRole(params.id, userData.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Viewers cannot add days" }, { status: 403 });

  const admin = createAdminSupabase();
  const { data: day, error } = await admin
    .from("days")
    .insert({
      trip_id: params.id,
      date: parsed.data.date,
      label: parsed.data.label ?? null,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ day }, { status: 201 });
}
