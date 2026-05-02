import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
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
  const { data: members, error } = await admin
    .from("trip_members")
    .select("*, profile:profiles!user_id(id, full_name, avatar_url, email)")
    .eq("trip_id", params.id)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ members: members ?? [] });
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
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Look up user by email in profiles
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", parsed.data.email)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "No account found with that email. They need to sign up first." },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("trip_members")
    .select("id")
    .eq("trip_id", params.id)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This person is already a member of this trip." }, { status: 409 });
  }

  // Add member
  const { data: member, error } = await admin
    .from("trip_members")
    .insert({
      trip_id: params.id,
      user_id: profile.id,
      role: parsed.data.role,
      invited_by: userData.user.id,
    })
    .select("*, profile:profiles!user_id(id, full_name, avatar_url, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ member }, { status: 201 });
}
