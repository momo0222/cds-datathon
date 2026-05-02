"use client";

import { FormEvent, useMemo, useState } from "react";
import { Day, ItineraryItem, ProposedTripChange, Trip } from "@/lib/types";
import { normalizeReviewProposal, ReviewProposal } from "@/components/trip/proposalDraftStore";

type TripWithDays = Trip & { days?: (Day & { items?: ItineraryItem[] })[] };

interface Props {
  trip: TripWithDays;
  onProposals?: (proposals: ReviewProposal[]) => void;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_COMMANDS = ["make this less packed", "add more food", "keep mornings free"];

function allItems(trip: TripWithDays) {
  return (trip.days ?? []).flatMap((day) => day.items ?? []);
}

export function TripAgentPanel({ trip, onProposals }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Tell me what changed, and I will draft itinerary suggestions for review.",
    },
  ]);

  const itinerarySummary = useMemo(() => {
    const count = allItems(trip).length;
    return `${trip.destination} · ${trip.start_date} to ${trip.end_date} · ${count} itinerary item${count === 1 ? "" : "s"}`;
  }, [trip]);

  async function submitCommand(event?: FormEvent<HTMLFormElement>, command = input) {
    event?.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const res = await fetch(`/api/trips/${trip.id}/agent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          trip,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data?.error || "Trip agent API is not available yet.",
          },
        ]);
        setLoading(false);
        return;
      }

      const proposals = ((data?.proposals ?? data?.changes ?? []) as ProposedTripChange[]).map(normalizeReviewProposal);
      onProposals?.(proposals);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `I drafted ${proposals.length} suggestion${proposals.length === 1 ? "" : "s"} for the review panel.`,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Trip agent API is not available yet.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-sand-100 bg-white shadow-2xl shadow-sand-300/40">
          <div className="border-b border-sand-100 bg-sand-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-sand-900">Trip Agent</h3>
                <p className="mt-0.5 text-xs text-sand-400">{itinerarySummary}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-sand-400 hover:bg-white hover:text-sand-700"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <p
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-sand-900 px-3 py-2 text-sm text-white"
                      : "max-w-[85%] rounded-2xl bg-sand-50 px-3 py-2 text-sm text-sand-600"
                  }
                >
                  {message.content}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-sand-100 px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {EXAMPLE_COMMANDS.map((command) => (
                <button
                  key={command}
                  onClick={() => submitCommand(undefined, command)}
                  disabled={loading}
                  className="rounded-full bg-sand-50 px-3 py-1.5 text-xs font-semibold text-sand-500 hover:bg-ocean/10 hover:text-ocean disabled:opacity-50"
                >
                  {command}
                </button>
              ))}
            </div>
            <form onSubmit={submitCommand} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="No Italian food, conference 5-7..."
                className="input min-w-0 flex-1 rounded-xl py-2"
              />
              <button disabled={loading || !input.trim()} className="btn-primary shrink-0 px-4 py-2 disabled:opacity-50">
                {loading ? "..." : "Send"}
              </button>
            </form>
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
