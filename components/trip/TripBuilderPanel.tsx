"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onCreated?: (tripId: string) => void;
}

export function TripBuilderPanel({ onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function handleBuild() {
    if (!destination.trim() || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    setStatus("Generating your itinerary with AI...");

    try {
      const res = await fetch("/api/ai/trip-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `${destination} Trip`,
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          currency: "USD",
          budget: budget ? parseFloat(budget) : undefined,
          travelers: parseInt(travelers) || 2,
          preferences: preferences.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to build trip");
        setLoading(false);
        setStatus("");
        return;
      }

      setStatus(`Created trip with ${data.days?.length ?? 0} days and ${data.items?.length ?? 0} items!`);

      setTimeout(() => {
        if (data.trip?.id) {
          if (onCreated) {
            onCreated(data.trip.id);
          } else {
            router.push(`/trips/${data.trip.id}`);
          }
        }
      }, 1500);
    } catch (err) {
      setError("Network error");
      setLoading(false);
      setStatus("");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-coral/10 text-amber-700 text-sm font-semibold hover:from-amber-500/20 hover:to-coral/20 transition-all"
      >
        <span className="text-base">✨</span>
        AI Trip Builder
      </button>
    );
  }

  return (
    <div className="card p-6 mb-6 animate-slide-up border-2 border-amber-500/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-sand-900 flex items-center gap-2">
            <span>✨</span> AI Trip Builder
          </h3>
          <p className="text-sand-400 text-xs mt-0.5">
            Describe your trip and AI will generate a full day-by-day itinerary
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setError(null); setStatus(""); }}
          className="text-sand-400 hover:text-sand-600 text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Destination *
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Tokyo, Japan"
              className="input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Trip Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring Break Tokyo"
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Travelers
            </label>
            <input
              type="number"
              value={travelers}
              onChange={(e) => setTravelers(e.target.value)}
              min="1"
              className="input w-full"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
              Budget (USD)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Optional"
              min="0"
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-1.5 block">
            Preferences / Style
          </label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder={"What kind of trip? Examples:\n• Foodie trip, lots of street food and ramen\n• Mix of culture and nightlife\n• Family-friendly, kid under 5\n• Adventure: hiking, surfing, outdoors\n• Budget-conscious, hostels ok"}
            rows={4}
            className="input w-full resize-none text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {status && !error && (
          <div className="bg-amber-50 text-amber-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
            {loading && (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-amber-400/30 border-t-amber-600 rounded-full" />
            )}
            {status}
          </div>
        )}

        <button
          onClick={handleBuild}
          disabled={loading || !destination.trim() || !startDate || !endDate}
          className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Building your trip..." : "Generate Itinerary with AI"}
        </button>
      </div>
    </div>
  );
}
