"use client";

import { useState } from "react";
import { ProposedTripChange } from "@/lib/types";
import { normalizeReviewProposal, ReviewProposal } from "@/components/trip/proposalDraftStore";

interface Props {
  tripId: string;
  currency?: string;
  onImported?: (proposals: ReviewProposal[]) => void;
}

export function SmartImportPanel({ tripId, currency = "USD", onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "upload" | "email">("paste");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ proposed: number } | null>(null);

  function storeApiProposals(proposals: ProposedTripChange[]) {
    const normalized = proposals.map(normalizeReviewProposal);
    setResult({ proposed: normalized.length });
    onImported?.(normalized);
  }

  async function handlePasteImport() {
    if (!emailBody.trim()) {
      setError("Paste confirmation text first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/imports/paste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          email_subject: emailSubject.trim(),
          email_body: emailBody.trim(),
          default_currency: currency,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        storeApiProposals((data.proposals ?? data.changes ?? []) as ProposedTripChange[]);
        setLoading(false);
        return;
      }

      setError(data.error || "Paste import failed.");
      setLoading(false);
      return;
    } catch (err) {
      setError("Paste import failed. Check that the import API and environment keys are configured.");
      setLoading(false);
      return;
    }
  }

  async function handleUploadImport() {
    if (!selectedFile) {
      setError("Choose a file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("trip_id", tripId);
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        const proposals = (data.proposals ?? data.changes ?? []) as ProposedTripChange[];
        if (proposals.length > 0) {
          storeApiProposals(proposals);
        } else {
          setResult({ proposed: 0 });
        }
        setLoading(false);
        return;
      }

      setError(data.error || "Upload import failed.");
      setLoading(false);
      return;
    } catch {
      setError("Upload import failed. Check that the upload API is configured.");
      setLoading(false);
      return;
    }
  }

  async function handleEmailImport() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/email/search?trip_id=${tripId}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        const proposals = (data.proposals ?? data.changes ?? []) as ProposedTripChange[];
        if (proposals.length > 0) {
          storeApiProposals(proposals);
          setLoading(false);
          return;
        }
        setError("Email search is connected, but no importable travel emails were returned yet.");
        setLoading(false);
        return;
      }
    } catch {
      // Person A's OAuth/email routes may not exist yet.
    }

    setError("Email import needs Person A's OAuth/email endpoints before it can fetch messages.");
    setLoading(false);
  }

  function handleImport() {
    if (activeTab === "upload") return handleUploadImport();
    if (activeTab === "email") return handleEmailImport();
    return handlePasteImport();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-ocean/10 to-purple-500/10 text-ocean text-sm font-semibold hover:from-ocean/20 hover:to-purple-500/20 transition-all"
      >
        <span className="text-base">📧</span>
        Smart Import
      </button>
    );
  }

  return (
    <div className="card p-6 mb-6 animate-slide-up border-2 border-ocean/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-sand-900 flex items-center gap-2">
            <span>📧</span> Smart Import
          </h3>
          <p className="text-sand-400 text-xs mt-0.5">
            Add travel confirmations as suggestions before they change the itinerary
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setError(null); setResult(null); }}
          className="text-sand-400 hover:text-sand-600 text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-sand-50 p-1">
          {[
            ["paste", "Paste"],
            ["upload", "Upload"],
            ["email", "Email"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as "paste" | "upload" | "email")}
              className={
                activeTab === key
                  ? "rounded-xl bg-white px-3 py-2 text-xs font-semibold text-sand-900 shadow-sm"
                  : "rounded-xl px-3 py-2 text-xs font-semibold text-sand-400 hover:text-sand-700"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "paste" && (
          <>
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
                Email Subject (optional)
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Your flight confirmation - Delta Air Lines"
                className="input w-full"
              />
            </div>

            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
                Email Body / Confirmation Text *
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder={"Paste your booking confirmation email here...\n\nExample:\nBooking Confirmation\nDelta Air Lines\nConfirmation: ABC123\nJFK → NRT\nMarch 27, 2026 at 1:15 PM\nPassenger: Joy Wang\nSeat: 24A Economy\n..."}
                rows={8}
                className="input w-full resize-none font-mono text-xs"
              />
            </div>
          </>
        )}

        {activeTab === "upload" && (
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Upload Confirmation
            </label>
            <input
              type="file"
              accept=".txt,.html,.pdf,.png,.jpg,.jpeg,.webp,text/plain,text/html,application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="input w-full"
            />
            <p className="mt-2 text-xs text-sand-400">
              Calls /api/imports/upload and shows suggestions returned by the API.
            </p>
          </div>
        )}

        {activeTab === "email" && (
          <div className="rounded-2xl bg-sand-50 px-4 py-3 text-sm text-sand-500">
            Calls /api/email/search when Person A's OAuth/email routes are available.
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
            Added {result.proposed} suggestion{result.proposed !== 1 ? "s" : ""} to review.
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || (activeTab === "paste" && !emailBody.trim()) || (activeTab === "upload" && !selectedFile)}
          className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              AI is parsing your email...
            </span>
          ) : (
            activeTab === "upload" ? "Upload for Review" : activeTab === "email" ? "Search Connected Email" : "Create Review Suggestions"
          )}
        </button>
      </div>
    </div>
  );
}
