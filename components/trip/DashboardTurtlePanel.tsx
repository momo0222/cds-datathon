"use client";

import { useState } from "react";

export function DashboardTurtlePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(23rem,calc(100vw-2.5rem))] overflow-hidden rounded-lg border border-sand-100 bg-white shadow-[0_1px_2px_rgba(24,40,28,0.04),0_22px_55px_rgba(29,158,117,0.16)]">
          <div className="flex items-start justify-between gap-3 border-b border-sand-100 bg-[linear-gradient(135deg,rgba(29,158,117,0.10),rgba(250,199,117,0.20))] px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ocean-dark">
                TRVL guide
              </p>
              <h3 className="font-display text-xl font-semibold text-sand-900">Hi, I'm turvle.</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-sm px-2 py-1 text-xs font-semibold text-sand-500 hover:bg-white hover:text-sand-800"
            >
              Close
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-6 text-sand-600">
              I keep the travel desk tidy: drafts first, review before changes, itinerary after approval.
            </p>
            <div className="space-y-3 border-l-2 border-coral pl-4">
              <p className="text-sm text-sand-600">
                <strong className="text-sand-900">Need a first plan?</strong> Use AI Trip Builder and describe the destination, dates, budget, and vibe.
              </p>
              <p className="text-sm text-sand-600">
                <strong className="text-sand-900">Already have bookings?</strong> Open a trip, then paste, upload, or import confirmations from Gmail.
              </p>
              <p className="text-sm text-sand-600">
                <strong className="text-sand-900">Want changes?</strong> Chat with me inside the trip and I will propose edits for you to review.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        aria-label="Open trip agent"
        className="flex h-16 w-16 items-center justify-center rounded-lg bg-moss shadow-[0_8px_18px_rgba(8,80,65,0.22),0_18px_44px_rgba(29,158,117,0.20)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <img
          src="/custom-turtle.png"
          alt="TRVL Turtle"
          className="h-10 w-10 object-contain"
        />
      </button>
    </div>
  );
}
