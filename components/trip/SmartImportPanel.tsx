"use client";

import { useEffect, useState } from "react";
import { ProposedTripChange } from "@/lib/types";
import { normalizeReviewProposal, ReviewProposal } from "@/components/trip/proposalDraftStore";

interface Props {
  tripId: string;
  currency?: string;
  onImported?: (proposals: ReviewProposal[]) => void;
}

type GmailMessage = {
  id: string;
  from: string | null;
  subject: string | null;
  date: string | null;
  snippet: string;
  best_match: {
    score: number;
    confidence: "high" | "medium" | "low" | "none";
    reasons: string[];
  } | null;
};

type GmailAccount = {
  id: string;
  email: string | null;
  expires_at: string | null;
  scopes?: string[];
};

export function SmartImportPanel({ tripId, currency = "USD", onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "upload" | "gmail">("paste");
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailHasReadScope, setGmailHasReadScope] = useState(false);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [gmailStatusLoading, setGmailStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ proposed: number } | null>(null);

  async function refreshGmailStatus() {
    setGmailStatusLoading(true);
    try {
      const res = await fetch("/api/oauth/google/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGmailConnected(Boolean(data.connected));
        setGmailHasReadScope(Boolean(data.has_gmail_read_scope));
        setGmailAccounts((data.accounts ?? []) as GmailAccount[]);
      } else {
        setGmailConnected(false);
        setGmailHasReadScope(false);
        setGmailAccounts([]);
      }
    } catch {
      setGmailConnected(false);
      setGmailHasReadScope(false);
      setGmailAccounts([]);
    } finally {
      setGmailStatusLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    refreshGmailStatus();
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    if (gmailStatus === "connected") {
      setOpen(true);
      setActiveTab("gmail");
      setResult({ proposed: 0 });
      refreshGmailStatus();
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }
    if (gmailStatus === "error") {
      setOpen(true);
      setActiveTab("gmail");
      setError("Gmail connection was cancelled or failed.");
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  function storeApiProposals(proposals: ProposedTripChange[]) {
    const normalized = proposals.map(normalizeReviewProposal);
    setResult({ proposed: normalized.length });
    onImported?.(normalized);
  }

  function connectGmail() {
    window.location.href = `/api/oauth/google/start?return_to=/trips/${tripId}`;
  }

  async function disconnectGmail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/google/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not disconnect Gmail.");
      }
      setGmailMessages([]);
      setSelectedMessageIds(new Set());
      await refreshGmailStatus();
    } catch {
      setError("Could not disconnect Gmail.");
    } finally {
      setLoading(false);
    }
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

  async function handleGmailSearch() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/email/search?trip_id=${tripId}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setGmailConnected(true);
        setGmailMessages((data.messages ?? []) as GmailMessage[]);
        setSelectedMessageIds(new Set());
        if ((data.messages ?? []).length === 0) {
          setError("No likely travel confirmations found in Gmail.");
        }
        setLoading(false);
        return;
      }

      setError(data.error || "Gmail search failed. Connect Gmail and try again.");
      if (data.needs_reconnect) {
        setGmailHasReadScope(false);
      }
      if (res.status === 401 || res.status === 403) {
        setGmailConnected(Boolean(data.needs_reconnect));
      }
      setLoading(false);
      return;
    } catch {
      setError("Gmail search is not available yet. Check that /api/email/search exists.");
      setLoading(false);
      return;
    }
  }

  async function handleGmailImport() {
    const messageIds = Array.from(selectedMessageIds);
    if (messageIds.length === 0) {
      setError("Select at least one Gmail message to import.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/email/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          message_ids: messageIds,
          default_currency: currency,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        storeApiProposals((data.proposals ?? []) as ProposedTripChange[]);
        setLoading(false);
        return;
      }

      setError(data.error || "Gmail import failed.");
      setLoading(false);
      return;
    } catch {
      setError("Gmail import is not available yet. Check that /api/email/import exists.");
      setLoading(false);
      return;
    }
  }

  function handleImport() {
    if (activeTab === "upload") return handleUploadImport();
    return handlePasteImport();
  }

  function toggleMessage(id: string) {
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-sm border border-ocean/20 bg-white px-4 py-2.5 text-sm font-semibold text-ocean shadow-[0_1px_2px_rgba(24,40,28,0.04),0_12px_28px_rgba(29,158,117,0.08)] transition-colors hover:border-ocean/40 hover:bg-ocean/5"
      >
        Smart Import
      </button>
    );
  }

  return (
    <div className="mb-6 animate-slide-up rounded-lg border border-ocean/15 bg-white p-5 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_44px_rgba(29,158,117,0.09)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-sand-900">Smart Import</h3>
          <p className="text-sand-400 text-xs mt-0.5">
            Pull confirmations into a review queue before they touch the itinerary.
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setError(null); setResult(null); }}
          className="rounded-sm px-2 py-1 text-sm text-sand-400 hover:bg-sand-50 hover:text-sand-700"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-1 rounded-sm bg-sand-50 p-1">
          {[
            ["paste", "Paste"],
            ["upload", "Upload"],
            ["gmail", "Gmail"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as "paste" | "upload" | "gmail");
                setError(null);
                setResult(null);
              }}
              className={
                activeTab === key
                  ? "rounded-sm bg-white px-3 py-2 text-xs font-semibold text-sand-900 shadow-[0_1px_2px_rgba(24,40,28,0.05)]"
                  : "rounded-sm px-3 py-2 text-xs font-semibold text-sand-400 hover:text-sand-700"
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
          </div>
        )}

        {activeTab === "gmail" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-sm border border-sand-100 bg-sand-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-sand-900">
                    {gmailConnected ? "Gmail connected" : "Gmail not connected"}
                  </p>
                  <p className="text-xs text-sand-400">
                    {gmailConnected
                      ? gmailAccounts.map((account) => account.email).filter(Boolean).join(", ") || "Ready to search confirmations"
                      : "Connect Gmail to find booking confirmations."}
                  </p>
                  {gmailConnected && !gmailHasReadScope && (
                    <p className="mt-1 text-xs font-medium text-amber-dark">
                      Gmail is connected, but read permission is missing. Disconnect and reconnect Gmail.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={refreshGmailStatus}
                  disabled={gmailStatusLoading}
                  className="btn-secondary px-3 py-2 text-xs disabled:opacity-50"
                >
                  {gmailStatusLoading ? "Checking..." : "Check"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!gmailConnected && (
                <button
                  onClick={connectGmail}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Connect Gmail
                </button>
              )}
              {gmailConnected && (
                <button
                  onClick={disconnectGmail}
                  disabled={loading}
                  className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={handleGmailSearch}
                disabled={loading || !gmailConnected || !gmailHasReadScope}
                className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              >
                Search Gmail
              </button>
            </div>

            {gmailMessages.length > 0 && (
              <div className="rounded-sm border border-sand-100 bg-white">
                <div className="border-b border-sand-100 px-4 py-3">
                  <p className="text-sm font-semibold text-sand-900">Gmail matches</p>
                  <p className="text-xs text-sand-400">Choose the emails to turn into suggestions.</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {gmailMessages.map((message) => (
                    <label
                      key={message.id}
                      className="flex cursor-pointer gap-3 border-b border-sand-100 px-4 py-3 last:border-b-0 hover:bg-sand-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMessageIds.has(message.id)}
                        onChange={() => toggleMessage(message.id)}
                        className="mt-1 h-4 w-4 accent-ocean"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-sand-900">
                            {message.subject || "No subject"}
                          </p>
                          {message.best_match && (
                            <span className="chip bg-ocean/10 text-ocean text-[10px] px-2 py-0.5">
                              {Math.round(message.best_match.score * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-sand-400">
                          {message.from || "Unknown sender"}
                          {message.date ? ` · ${message.date}` : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-sand-500">{message.snippet}</p>
                        {message.best_match?.reasons?.length ? (
                          <p className="mt-2 text-xs text-sand-500">
                            {message.best_match.reasons.join(" ")}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {gmailMessages.length > 0 && (
              <button
                onClick={handleGmailImport}
                disabled={loading || selectedMessageIds.size === 0}
                className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
              >
                Import Selected for Review
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-amber-dark">{error}</p>}

        {result && (
          <div className="rounded-sm bg-ocean/10 px-4 py-3 text-sm font-medium text-ocean-dark">
            Added {result.proposed} suggestion{result.proposed !== 1 ? "s" : ""} to review.
          </div>
        )}

        {activeTab !== "gmail" && (
          <button
            onClick={handleImport}
            disabled={loading || (activeTab === "paste" && !emailBody.trim()) || (activeTab === "upload" && !selectedFile)}
            className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                Analyzing...
              </span>
            ) : (
              activeTab === "upload" ? "Upload for Review" : "Create Review Suggestions"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
