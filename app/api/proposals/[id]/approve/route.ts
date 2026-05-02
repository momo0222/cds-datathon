import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { canEdit, getTripRole } from "@/lib/check-role";

const payloadSchema = z.object({
  type: z.enum(["flight", "hotel", "transport", "activity", "restaurant"]),
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

async function findOrCreateDay(admin: ReturnType<typeof createAdminSupabase>, tripId: string, date: string) {
  const { data: existingDay, error: existingError } = await admin
    .from("days")
    .select("*")
    .eq("trip_id", tripId)
    .eq("date", date)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingDay) {
    return existingDay;
  }

  const { count, error: countError } = await admin
    .from("days")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  if (countError) {
    throw new Error(countError.message);
  }

  const { data: day, error: insertError } = await admin
    .from("days")
    .insert({
      trip_id: tripId,
      date,
      label: null,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return day;
}

export async function POST(
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
  const { data: proposal, error: proposalError } = await admin
    .from("proposed_trip_changes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const role = await getTripRole(proposal.trip_id, userData.user.id);
  if (!canEdit(role)) {
    return NextResponse.json({ error: "Viewers cannot approve proposals" }, { status: 403 });
  }

  if (proposal.status !== "pending") {
    return NextResponse.json({ error: `Proposal is already ${proposal.status}` }, { status: 409 });
  }

  const parsedPayload = payloadSchema.safeParse(proposal.payload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: parsedPayload.error.flatten() }, { status: 400 });
  }

  const payload = parsedPayload.data;
  const action = proposal.action as "create" | "update" | "move" | "delete";
  let item = null;

  if (action === "create") {
    if (!payload.day_date) {
      return NextResponse.json({ error: "Proposal needs a day_date before approval" }, { status: 400 });
    }

    const day = await findOrCreateDay(admin, proposal.trip_id, payload.day_date);
    const { data: createdItem, error: insertError } = await admin
      .from("itinerary_items")
      .insert({
        day_id: day.id,
        trip_id: proposal.trip_id,
        type: payload.type,
        status: "confirmed",
        title: payload.title,
        detail: payload.detail ?? null,
        time: payload.time ?? null,
        end_time: payload.end_time ?? null,
        location_name: payload.location_name ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        booking_ref: payload.booking_ref ?? null,
        booking_url: payload.booking_url ?? null,
        cost: payload.cost ?? 0,
        currency: payload.currency ?? "USD",
        notes: payload.notes ?? null,
        added_by: userData.user.id,
        sort_order: 0,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
    item = createdItem;
  }

  if (action === "update" || action === "move") {
    if (!proposal.target_item_id) {
      return NextResponse.json({ error: "Proposal needs target_item_id" }, { status: 400 });
    }

    const updateBody: Record<string, unknown> = {
      type: payload.type,
      title: payload.title,
      detail: payload.detail ?? null,
      time: payload.time ?? null,
      end_time: payload.end_time ?? null,
      location_name: payload.location_name ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      booking_ref: payload.booking_ref ?? null,
      booking_url: payload.booking_url ?? null,
      cost: payload.cost ?? 0,
      currency: payload.currency ?? "USD",
      notes: payload.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (payload.day_date) {
      const day = await findOrCreateDay(admin, proposal.trip_id, payload.day_date);
      updateBody.day_id = day.id;
    }

    const { data: updatedItem, error: updateError } = await admin
      .from("itinerary_items")
      .update(updateBody)
      .eq("id", proposal.target_item_id)
      .eq("trip_id", proposal.trip_id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    item = updatedItem;
  }

  if (action === "delete") {
    if (!proposal.target_item_id) {
      return NextResponse.json({ error: "Proposal needs target_item_id" }, { status: 400 });
    }

    const { data: deletedItem, error: deleteError } = await admin
      .from("itinerary_items")
      .delete()
      .eq("id", proposal.target_item_id)
      .eq("trip_id", proposal.trip_id)
      .select("*")
      .single();

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
    item = deletedItem;
  }

  const { data: approvedProposal, error: approveError } = await admin
    .from("proposed_trip_changes")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.user.id,
    })
    .eq("id", proposal.id)
    .select("*")
    .single();

  if (approveError) {
    return NextResponse.json({ error: approveError.message }, { status: 400 });
  }

  return NextResponse.json({ proposal: approvedProposal, item });
}
