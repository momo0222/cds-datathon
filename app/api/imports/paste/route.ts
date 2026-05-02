import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { extractTravelProposals } from "@/lib/imports/travel-extractor";

const requestSchema = z.object({
  trip_id: z.string().uuid(),
  email_subject: z.string().optional().default(""),
  email_body: z.string().min(1),
  default_currency: z.string().optional().default("USD"),
});

function proposalPayload(proposal: Awaited<ReturnType<typeof extractTravelProposals>>[number]) {
  return {
    type: proposal.type,
    title: proposal.title,
    detail: proposal.detail ?? null,
    day_date: proposal.day_date ?? null,
    time: proposal.time ?? null,
    end_time: proposal.end_time ?? null,
    location_name: proposal.location_name ?? null,
    latitude: proposal.latitude ?? null,
    longitude: proposal.longitude ?? null,
    booking_ref: proposal.booking_ref ?? null,
    booking_url: proposal.booking_url ?? null,
    cost: proposal.cost ?? 0,
    currency: proposal.currency ?? "USD",
    notes: proposal.notes ?? null,
    source_ref: proposal.source_ref ?? null,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trip_id, email_subject, email_body, default_currency } = parsed.data;
  const admin = createAdminSupabase();

  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      trip_id,
      user_id: user.id,
      source: "paste",
      status: "processing",
      source_ref: email_subject || null,
    })
    .select("*")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Failed to create import job" }, { status: 400 });
  }

  try {
    const proposals = await extractTravelProposals({
      tripId: trip_id,
      source: "paste",
      subject: email_subject,
      body: email_body,
      defaultCurrency: default_currency,
      sourceRef: email_subject || null,
      baseConfidence: 0.9,
    });

    const { data: saved, error: proposalError } = await admin
      .from("proposed_trip_changes")
      .insert(
        proposals.map((proposal) => ({
          trip_id,
          import_job_id: job.id,
          created_by: user.id,
          source: "paste",
          action: proposal.action,
          target_item_id: proposal.target_item_id ?? null,
          status: "pending",
          payload: proposalPayload(proposal),
          confidence: proposal.confidence,
          warnings: proposal.warnings,
        }))
      )
      .select("*");

    if (proposalError) {
      throw new Error(proposalError.message);
    }

    await admin
      .from("import_jobs")
      .update({
        status: "needs_review",
        raw_summary: `Created ${saved?.length ?? 0} proposal(s) from pasted confirmation text`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ import_job: { ...job, status: "needs_review" }, proposals: saved ?? [] });
  } catch (error) {
    await admin
      .from("import_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Paste import failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paste import failed" },
      { status: 400 }
    );
  }
}
