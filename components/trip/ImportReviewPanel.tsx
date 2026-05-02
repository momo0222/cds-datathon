"use client";

import { useEffect, useMemo, useState } from "react";
import { ITEM_TYPE_CONFIG } from "@/lib/types";
import { cn, formatCurrency, formatTime } from "@/lib/utils";
import {
  normalizeReviewProposal,
  ReviewProposal,
} from "@/components/trip/proposalDraftStore";

interface Props {
  tripId: string;
  currency?: string;
  incomingProposals?: ReviewProposal[];
  onChanged?: () => void;
}

const ACTION_LABELS: Record<ReviewProposal["action"], string> = {
  create: "Create",
  update: "Update",
  move: "Move",
  delete: "Delete",
};

const SOURCE_LABELS: Record<ReviewProposal["source"], string> = {
  gmail: "Gmail",
  upload: "Upload",
  paste: "Smart Import",
  agent: "Trip Agent",
};

export function ImportReviewPanel({ tripId, currency = "USD", incomingProposals = [], onChanged }: Props) {
  const [proposals, setProposals] = useState<ReviewProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadProposals() {
    setLoading(true);

    try {
      const res = await fetch(`/api/proposals?trip_id=${tripId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const remote = (data.proposals ?? data.changes ?? []).map(normalizeReviewProposal) as ReviewProposal[];
        setProposals(remote.filter((p) => p.status !== "approved" && p.status !== "rejected"));
        setLoading(false);
        return;
      }
    } catch {
      // Proposal list route is optional during integration; imported rows are still shown from API responses.
    }

    setProposals([]);
    setLoading(false);
  }

  useEffect(() => {
    loadProposals();
  }, [tripId]);

  useEffect(() => {
    if (incomingProposals.length === 0) return;
    setProposals((current) => {
      const byId = new Map(current.map((proposal) => [proposal.id, proposal]));
      incomingProposals.forEach((proposal) => byId.set(proposal.id, proposal));
      return Array.from(byId.values()).filter((p) => p.status !== "approved" && p.status !== "rejected");
    });
    setLoading(false);
  }, [incomingProposals]);

  const pendingCount = useMemo(() => proposals.filter((p) => p.status === "pending").length, [proposals]);

  async function approveProposal(proposal: ReviewProposal) {
    setMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/approve`, { method: "POST" });
      if (res.ok) {
        setProposals((current) => current.filter((item) => item.id !== proposal.id));
        setMessage("✓ Added to your itinerary!");
        onChanged?.();
        return;
      }
      const data = await res.json().catch(() => null);
      setMessage(data?.error || "Approval endpoint is not available yet.");
      return;
    } catch {
      setMessage("Approval endpoint is not available yet.");
    }
  }

  async function rejectProposal(proposal: ReviewProposal) {
    setMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/reject`, { method: "POST" });
      if (res.ok) {
        setProposals((current) => current.filter((item) => item.id !== proposal.id));
        return;
      }
      const data = await res.json().catch(() => null);
      setMessage(data?.error || "Reject endpoint is not available yet.");
      return;
    } catch {
      setMessage("Reject endpoint is not available yet.");
    }
  }

  if (!loading && pendingCount === 0) {
    return null;
  }

  return (
    <section className="card p-5 mb-6 border-ocean/15">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-sand-900">Review Suggestions</h3>
          <p className="text-xs text-sand-400 mt-0.5">
            Imports and trip-agent changes wait here before they touch the itinerary.
          </p>
        </div>
        <span className="chip bg-ocean/10 text-ocean">{pendingCount} pending</span>
      </div>

      {message && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-sand-50 px-4 py-3 text-sm text-sand-400">⏳ Finding travel suggestions...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {proposals.map((proposal) => {
            const typeCfg = ITEM_TYPE_CONFIG[proposal.type ?? "activity"];
            const amount = proposal.cost ?? 0;

            return (
              <article
                key={proposal.id}
                className={cn("rounded-2xl border border-sand-100 p-4", typeCfg.bgClass)}
              >
                <div className="flex gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg">
                    {typeCfg.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="chip bg-white text-sand-600 text-[10px] px-2 py-0.5">
                        {ACTION_LABELS[proposal.action]}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-sand-400">
                        {SOURCE_LABELS[proposal.source]}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-sand-900">{proposal.title}</h4>
                    {proposal.detail && <p className="text-xs text-sand-500 mt-1">{proposal.detail}</p>}

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-sand-500">
                      {proposal.day_date && <span>{proposal.day_date}</span>}
                      {proposal.time && <span>{formatTime(proposal.time)}</span>}
                      {proposal.end_time && <span>to {formatTime(proposal.end_time)}</span>}
                      {proposal.location_name && <span>{proposal.location_name}</span>}
                      {amount > 0 && <span>{formatCurrency(amount, proposal.currency ?? currency)}</span>}
                    </div>

                    {proposal.warnings.length > 0 && (
                      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        {proposal.warnings.join(" ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => rejectProposal(proposal)}
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveProposal(proposal)}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    Approve
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
