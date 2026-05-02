"use client";

import { useState } from "react";

export function DashboardTurtlePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-sand-100 bg-white shadow-2xl shadow-sand-300/40">
          <div className="border-b border-sand-100 bg-sand-50 px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-sand-900">Trip Agent</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-2 py-1 text-xs font-semibold text-sand-400 hover:bg-white hover:text-sand-700"
            >
              Close
            </button>
          </div>
          <div className="px-4 py-4">
            <div className="flex flex-col gap-2">
              <p className="rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600">
                Hi, welcome to TRVL! I am your tiny turtle trip helper. 🐢
              </p>
              <p className="rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600">
                Here is how to get started:
              </p>
              <p className="rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600">
                ✦ Use <strong>AI Trip Builder</strong> to generate a full itinerary from a prompt — just describe your trip and I will plan it out.
              </p>
              <p className="rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600">
                ✦ Or hit <strong>New Trip</strong> to create one manually and build it out yourself.
              </p>
              <p className="rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600">
                Once you are inside a trip, I can help you adjust the itinerary — just chat with me there!
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        aria-label="Open trip agent"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-moss text-2xl shadow-xl shadow-sand-300/50 transition-transform hover:scale-105 active:scale-95"
      >
        🐢
      </button>
    </div>
  );
}
