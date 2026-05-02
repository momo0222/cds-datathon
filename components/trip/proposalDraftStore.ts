import { ProposedTripChange } from "@/lib/types";

export type ReviewProposal = ProposedTripChange & {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ProposalRow = {
  id?: string;
  trip_id: string;
  source: ProposedTripChange["source"];
  action: ProposedTripChange["action"];
  target_item_id?: string | null;
  status?: ReviewProposal["status"];
  payload?: Partial<ProposedTripChange>;
  confidence?: number;
  warnings?: string[];
  created_at?: string;
};

export function normalizeReviewProposal(raw: ProposedTripChange | ProposalRow): ReviewProposal {
  const row = raw as ProposalRow;
  const payload = row.payload ?? {};
  const proposal = raw as ProposedTripChange;

  return {
    trip_id: row.trip_id ?? proposal.trip_id,
    source: row.source ?? proposal.source,
    action: row.action ?? proposal.action,
    target_item_id: row.target_item_id ?? proposal.target_item_id ?? payload.target_item_id ?? null,
    type: proposal.type ?? payload.type ?? "activity",
    title: proposal.title ?? payload.title ?? "Untitled suggestion",
    detail: proposal.detail ?? payload.detail ?? null,
    day_date: proposal.day_date ?? payload.day_date ?? null,
    time: proposal.time ?? payload.time ?? null,
    end_time: proposal.end_time ?? payload.end_time ?? null,
    location_name: proposal.location_name ?? payload.location_name ?? null,
    booking_ref: proposal.booking_ref ?? payload.booking_ref ?? null,
    booking_url: proposal.booking_url ?? payload.booking_url ?? null,
    cost: proposal.cost ?? payload.cost ?? 0,
    currency: proposal.currency ?? payload.currency,
    notes: proposal.notes ?? payload.notes ?? null,
    confidence: Number(row.confidence ?? proposal.confidence ?? payload.confidence ?? 0),
    warnings: row.warnings ?? proposal.warnings ?? payload.warnings ?? [],
    source_ref: proposal.source_ref ?? payload.source_ref ?? null,
    id: row.id ?? proposal.id ?? `remote-${Date.now()}`,
    status: row.status ?? "pending",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}
