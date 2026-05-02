import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { canEdit, getTripRole } from '@/lib/check-role';

const sourceSchema = z.enum(["gmail", "upload", "paste", "agent"]);
const actionSchema = z.enum(["create", "update", "move", "delete"]);
const itemTypeSchema = z.enum(["flight", "hotel", "transport", "activity", "restaurant"]);

const proposalPayloadSchema = z.object({
  type: itemTypeSchema,
  title: z.string().min(1),
  detail: z.string().nullable().optional(),
  day_date: z.string().nullable().optional(),
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
});

const proposalInputSchema = proposalPayloadSchema.extend({
  source: sourceSchema.optional(),
  action: actionSchema.optional(),
  target_item_id: z.string().uuid().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  warnings: z.array(z.string()).optional(),
});

const createProposalsSchema = z.object({
  trip_id: z.string().uuid(),
  source: sourceSchema,
  import_job_id: z.string().uuid().nullable().optional(),
  source_ref: z.string().nullable().optional(),
  proposals: z.array(proposalInputSchema).min(1),
});

export async function GET(request: NextRequest) {
    const supabase = await createServerSupabase();
    const { data: userData } = await supabase.auth.getUser();

    if(!userData.user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    const tripId = request.nextUrl.searchParams.get("trip_id");

    if(!tripId){
        return NextResponse.json({error: "trip_id is required"}, {status: 400});
    }
    const role = await getTripRole(tripId, userData.user.id);

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const admin = createAdminSupabase();
  const { data: proposals, error } = await admin
    .from("proposed_trip_changes")
    .select("*")
    .eq("trip_id", tripId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ proposals: proposals ?? [] });
}

export async function POST(request: NextRequest) {
    const supabase = await createServerSupabase();
    const {data: userData } = await supabase.auth.getUser();

    if(!userData.user) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
const json = await request.json().catch(() => null);
  const parsed = createProposalsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trip_id, source, import_job_id, source_ref, proposals } = parsed.data;

  const role = await getTripRole(trip_id, userData.user.id);

  if (!canEdit(role)) {
    return NextResponse.json({ error: "Viewers cannot create proposals" }, { status: 403 });
  }

  const rows = proposals.map((proposal) => {
    const {
      source: proposalSource,
      action,
      target_item_id,
      confidence,
      warnings,
      ...payload
    } = proposal;

    return {
      trip_id,
      import_job_id: import_job_id ?? null,
      created_by: userData.user.id,
      source: proposalSource ?? source,
      action: action ?? "create",
      target_item_id: target_item_id ?? null,
      status: "pending",
      payload: {
        ...payload,
        source_ref: source_ref ?? null,
      },
      confidence: confidence ?? 0.75,
      warnings: warnings ?? [],
    };
  });

  const admin = createAdminSupabase();
  const { data: created, error } = await admin
    .from("proposed_trip_changes")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ proposals: created ?? [] }, { status: 201 });
}
