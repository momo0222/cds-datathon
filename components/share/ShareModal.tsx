"use client";

import { useState } from "react";
import { Trip } from "@/lib/types";
import { initials } from "@/lib/utils";

interface Props {
  trip: Trip;
  memberNames: string[];
  shareSlug?: string;
  onClose: () => void;
  onInvite?: (email: string, role: "editor" | "viewer") => void;
}

export function ShareModal({ trip, memberNames, shareSlug, onClose, onInvite }: Props) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  const link = shareSlug ? `trvl.ai/s/${shareSlug}` : "Generate a link first";

  function handleCopy() {
    navigator.clipboard?.writeText?.(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleInvite() {
    if (email.trim() && onInvite) {
      onInvite(email.trim(), role);
      setEmail("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-[min(440px,92vw)] p-8 shadow-2xl animate-slide-up"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-xl font-semibold">Share Itinerary</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-sand-100 flex items-center justify-center text-lg hover:bg-sand-200 transition-colors">
            ×
          </button>
        </div>

        <p className="text-sm text-sand-400 mb-5 leading-relaxed">
          Anyone with the link can view <strong className="text-sand-700">{trip.name}</strong>. Collaborators can suggest edits.
        </p>

        {/* Link share */}
        <div className="flex gap-2 mb-5 bg-sand-50 rounded-xl p-1.5">
          <div className="flex-1 px-3.5 py-2.5 font-mono text-sm text-sand-400 truncate">
            {link}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ background: copied ? "#2DA478" : trip.color }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Email invite */}
        <div className="flex gap-2 mb-6">
          <input
            type="email"
            placeholder="friend@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            className="input flex-1"
          />
          <button onClick={handleInvite} className="btn-primary">
            Invite
          </button>
        </div>

        {/* Current members */}
        <div className="border-t border-sand-100 pt-4">
          <p className="font-mono text-[11px] text-sand-400 uppercase tracking-wider mb-3">
            Shared with
          </p>
          <div className="flex flex-wrap gap-2">
            {memberNames.map(name => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 bg-sand-50 rounded-xl text-sm">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: trip.color }}
                >
                  {initials(name)}
                </div>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
