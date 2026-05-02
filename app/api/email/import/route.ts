import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { canEdit, getTripRole } from "@/lib/check-role";
import { getGmailAccessToken, gmailFetch } from "@/lib/gmail";
import { extractMessageContent, GmailMessage } from "@/lib/gmail-message";
import { extractTravelProposals } from "@/lib/imports/travel-extractor";
import { scoreEmailForTrip, TripMatchTrip } from "@/lib/trip-match";

const importSchema = z.object({
  trip_id: z.string().uuid(),
  message_ids: z.array(z.string().min(1)).min(1).max(5),
  account_id: z.string().uuid().nullable().optional(),
  default_currency: z.string().optional().default("USD"),
  allow_low_confidence: z.boolean().optional().default(true),
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
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trip_id, message_ids, account_id, default_currency, allow_low_confidence } = parsed.data;
  const role = await getTripRole(trip_id, userData.user.id);
  if (!canEdit(role)) {
    return NextResponse.json({ error: "Viewers cannot import emails" }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select("id,name,destination,start_date,end_date")
    .eq("id", trip_id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { data: job, error: jobError } = await admin
    .from("import_jobs")
    .insert({
      trip_id,
      user_id: userData.user.id,
      source: "gmail",
      status: "processing",
      source_ref: message_ids.join(","),
      raw_summary: `Importing ${message_ids.length} Gmail message(s)`,
    })
    .select("*")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Failed to create import job" }, { status: 400 });
  }

  try {
    const accessToken = await getGmailAccessToken(userData.user.id, account_id);
    const savedRows = [];
    const importedMessages = [];

    for (const messageId of message_ids) {
      const params = new URLSearchParams({ format: "full" });
      const message = await gmailFetch<GmailMessage>(
        accessToken,
        `/users/me/messages/${encodeURIComponent(messageId)}?${params.toString()}`
      );
      const content = extractMessageContent(message);
      const match = scoreEmailForTrip(content, trip as TripMatchTrip);

      if (match.score < 0.2 && !allow_low_confidence) {
        importedMessages.push({
          id: messageId,
          subject: content.subject,
          match,
          skipped: true,
          reason: "Low confidence trip match",
        });
        continue;
      }

      const matchWarnings =
        match.score < 0.2
          ? ["Low confidence trip match - review carefully"]
          : match.score < 0.45
            ? ["Medium-low trip match confidence - review dates and destination"]
            : [];

      const bodyForAI = content.body.slice(0, 30000);
      const proposals = await extractTravelProposals({
        tripId: trip_id,
        source: "gmail",
        subject: content.subject,
        body: bodyForAI,
        defaultCurrency: default_currency,
        sourceRef: messageId,
        baseConfidence: Math.max(0.4, Math.min(0.95, match.score)),
        extraWarnings: matchWarnings,
      });

      if (proposals.length > 0) {
        const { data: rows, error: proposalError } = await admin
          .from("proposed_trip_changes")
          .insert(
            proposals.map((proposal) => ({
              trip_id,
              import_job_id: job.id,
              created_by: userData.user.id,
              source: "gmail",
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
        savedRows.push(...(rows ?? []));
      }

      importedMessages.push({
        id: messageId,
        subject: content.subject,
        from: content.from,
        date: content.date,
        match,
        proposal_count: proposals.length,
      });
    }

    const { error: updateError } = await admin
      .from("import_jobs")
      .update({
        status: "needs_review",
        raw_summary: `Imported ${savedRows.length} proposal(s) from ${message_ids.length} Gmail message(s)`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      import_job: { ...job, status: "needs_review" },
      messages: importedMessages,
      proposals: savedRows,
    });
  } catch (error) {
    await admin
      .from("import_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Gmail import failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gmail import failed" },
      { status: 400 }
    );
  }
}
