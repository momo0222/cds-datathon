import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

const updateSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; memberId: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const { data: member, error } = await admin
    .from("trip_members")
    .update({ role: parsed.data.role })
    .eq("id", params.memberId)
    .eq("trip_id", params.id)
    .select("*, profile:profiles!user_id(id, full_name, avatar_url, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ member });
}

export async function DELETE(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string; memberId: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  // Don't allow removing the owner
  const { data: target } = await admin
    .from("trip_members")
    .select("role")
    .eq("id", params.memberId)
    .single();

  if (target?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the trip owner." }, { status: 403 });
  }

  const { error } = await admin
    .from("trip_members")
    .delete()
    .eq("id", params.memberId)
    .eq("trip_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
