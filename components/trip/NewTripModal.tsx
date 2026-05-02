"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultCurrency?: string;
}

export function NewTripModal({ defaultCurrency = "USD" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const router = useRouter();

  async function handleCreate() {
    setError(null);

    if (!name.trim() || !destination.trim() || !startDate || !endDate) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        destination,
        start_date: startDate,
        end_date: endDate,
        currency: defaultCurrency,
        create_days: true,
      }),
    });

    const data = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      setError(data?.error?.message ?? data?.error ?? "Failed to create trip");
      setLoading(false);
      return;
    }

    const tripId = data?.trip?.id;
    if (!tripId) {
      setError("Trip created but no trip id returned.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    router.push(`/trips/${tripId}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 mt-2"
      >
        <span className="text-lg leading-none">+</span> New Trip
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !loading && setOpen(false)}
          />

          <div className="relative w-full max-w-lg card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-sand-900">
                  Create a trip
                </h2>
                <p className="text-sand-400 text-sm">
                  This will create the trip and auto-generate one row per day.
                </p>
              </div>
              <button
                className="btn-secondary !px-3 !py-2 text-xs"
                onClick={() => !loading && setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">
                  Trip name
                </label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring Break"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">
                  Destination
                </label>
                <input
                  className="input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Tokyo, Japan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">
                    Start date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">
                    End date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="btn-secondary"
                  onClick={() => !loading && setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
