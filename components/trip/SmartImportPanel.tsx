"use client";

import { useState } from "react";

interface Props {
  tripId: string;
  currency?: string;
  onImported: () => void;
}

export function SmartImportPanel({ tripId, currency = "USD", onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number } | null>(null);

  async function handleImport() {
    if (!emailBody.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/import-email", {
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
      if (!res.ok) {
        setError(data.error || "Import failed");
        setLoading(false);
        return;
      }

      setResult({ created: data.created });
      setLoading(false);

      setTimeout(() => {
        onImported();
      }, 1500);
    } catch (err) {
      setError("Network error");
      setLoading(false);
    }
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
            Paste a booking confirmation email and AI will extract flights, hotels, and activities
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
            Successfully imported {result.created} item{result.created !== 1 ? "s" : ""}! Refreshing...
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !emailBody.trim()}
          className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              AI is parsing your email...
            </span>
          ) : (
            "Import with AI"
          )}
        </button>
      </div>
    </div>
  );
}
