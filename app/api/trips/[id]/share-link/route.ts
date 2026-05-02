import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import crypto from "crypto";

const updateSchema = z.object({
  allow_suggestions: z.boolean().optional(),
});

function generateSlug(tripName: string): string {
  const base = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base}-${suffix}`;
}

// GET: get existing share link for this trip
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
  const { data: link } = await admin
    .from("shared_links")
    .select("*")
    .eq("trip_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ link: link ?? null });
}

// POST: create a new share link (or return existing)
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

  const admin = createAdminSupabase();

  // Check if link already exists
  const { data: existing } = await admin
    .from("shared_links")
    .select("*")
    .eq("trip_id", params.id)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ link: existing });
  }

  // Get trip name for slug
  const { data: trip } = await admin
    .from("trips")
    .select("name")
    .eq("id", params.id)
    .single();

  const slug = generateSlug(trip?.name ?? "trip");

  const { data: link, error } = await admin
    .from("shared_links")
    .insert({
      trip_id: params.id,
      slug,
      allow_suggestions: false,
      created_by: userData.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ link }, { status: 201 });
}

// PATCH: update share link settings
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
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: link, error } = await admin
    .from("shared_links")
    .update(parsed.data)
    .eq("trip_id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ link });
}

// DELETE: remove share link
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
  const { error } = await admin
    .from("shared_links")
    .delete()
    .eq("trip_id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
