"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
type FlowerPhase = "idle" | "approach" | "chomp";

const EXAMPLE_COMMANDS = ["make this less packed", "add more food", "keep mornings free"];
const DEFAULT_SIZE = { width: 384, height: 512 };
const MIN_SIZE = { width: 320, height: 384 };
const FOOD_PATTERN = /\b(food|eat|eating|meal|breakfast|brunch|lunch|dinner|restaurant|snack|cafe|coffee|dessert|hungry)\b/i;
const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content: "Hi, I am your tiny turtle trip helper. Tell me what changed, and I will turn it into suggestions for review.",
  },
];

function allItems(trip: TripWithDays) {
  return (trip.days ?? []).flatMap((day) => day.items ?? []);
}

export function TripAgentPanel({ trip, onProposals }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [flowerPhase, setFlowerPhase] = useState<FlowerPhase>("idle");
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return DEFAULT_MESSAGES;

    try {
      const saved = window.localStorage.getItem(`trvl:trip-agent-messages:${trip.id}`);
      return saved ? JSON.parse(saved) : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const resizeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const flowerTimersRef = useRef<number[]>([]);

  const itinerarySummary = useMemo(() => {
    const count = allItems(trip).length;
    return `${trip.destination} · ${trip.start_date} to ${trip.end_date} · ${count} itinerary item${count === 1 ? "" : "s"}`;
  }, [trip]);

  useEffect(() => {
    window.localStorage.setItem(`trvl:trip-agent-messages:${trip.id}`, JSON.stringify(messages));
  }, [messages, trip.id]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      flowerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  function triggerFlowerChomp() {
    flowerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    flowerTimersRef.current = [];
    setFlowerPhase("approach");
    flowerTimersRef.current.push(window.setTimeout(() => setFlowerPhase("chomp"), 700));
    flowerTimersRef.current.push(window.setTimeout(() => setFlowerPhase("idle"), 1300));
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: size.width,
      height: size.height,
    };
  }

  function resizePanel(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const maxWidth = Math.max(MIN_SIZE.width, window.innerWidth - 40);
    const maxHeight = Math.max(MIN_SIZE.height, window.innerHeight - 96);
    const nextWidth = Math.min(maxWidth, Math.max(MIN_SIZE.width, start.width + start.x - event.clientX));
    const nextHeight = Math.min(maxHeight, Math.max(MIN_SIZE.height, start.height + start.y - event.clientY));

    setSize({ width: nextWidth, height: nextHeight });
  }

  function stopResize(event: React.PointerEvent<HTMLButtonElement>) {
    if (resizeStartRef.current?.pointerId !== event.pointerId) return;
    resizeStartRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function submitCommand(event?: FormEvent<HTMLFormElement>, command = input) {
    event?.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;

    setInput("");
    setLoading(true);
    if (FOOD_PATTERN.test(trimmed)) {
      triggerFlowerChomp();
    }
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const res = await fetch(`/api/trips/${trip.id}/agent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          trip,
          tone: "cute, warm, concise turtle travel helper",
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data?.error || "My trip-planning shell is waiting on the agent API. Try again once it is connected.",
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
          content:
            data?.message ||
            `Shell yeah, I drafted ${proposals.length} suggestion${proposals.length === 1 ? "" : "s"} for the review panel.`,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "My trip-planning shell is waiting on the agent API. Try again once it is connected.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="relative overflow-hidden rounded-3xl border border-sand-100 bg-white shadow-2xl shadow-sand-300/40"
          style={{
            width: `min(${size.width}px, calc(100vw - 2.5rem))`,
            height: `min(${size.height}px, calc(100vh - 6rem))`,
            minWidth: MIN_SIZE.width,
            minHeight: MIN_SIZE.height,
          }}
        >
          <button
            type="button"
            aria-label="Resize trip agent"
            onPointerDown={startResize}
            onPointerMove={resizePanel}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            className="absolute left-2 top-2 z-10 h-6 w-6 cursor-nwse-resize rounded-md border-l-2 border-t-2 border-sand-300 bg-transparent hover:border-ocean"
          >
            <span className="absolute left-1 top-1 h-3 w-3 border-l border-t border-sand-300" />
          </button>
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

          <div className="h-[calc(100%-13rem)] overflow-y-auto px-4 py-3 space-y-3">
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
            <div ref={messagesEndRef} />
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
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-moss text-2xl shadow-xl shadow-sand-300/50 transition-transform hover:scale-105 active:scale-95"
      >
        <span className={flowerPhase === "chomp" ? "scale-110 transition-transform duration-150" : "transition-transform duration-300"}>
          🐢
        </span>
        {flowerPhase === "chomp" && (
          <span className="absolute left-2 top-5 h-2 w-3 rounded-full bg-sand-900/70" aria-hidden="true" />
        )}
        {flowerPhase !== "idle" && (
          <span
            className={
              flowerPhase === "approach"
                ? "absolute -left-2 top-3 text-lg transition-all duration-700 ease-in-out"
                : "absolute left-2 top-3 scale-0 text-lg opacity-0 transition-all duration-200"
            }
            aria-hidden="true"
          >
            🌸
          </span>
        )}
      </button>
    </div>
  );
}
