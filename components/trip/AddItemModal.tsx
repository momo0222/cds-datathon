"use client";

import { useState } from "react";
import { ItemType, ItemStatus, ITEM_TYPE_CONFIG, STATUS_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  tripId: string;
  dayId: string;
  sortOrder: number;
  currency?: string;
  onClose: () => void;
  onAdded: () => void;
}

const ITEM_TYPES: ItemType[] = ["flight", "hotel", "transport", "activity", "restaurant"];
const STATUSES: ItemStatus[] = ["confirmed", "pending", "suggestion"];

export function AddItemModal({ tripId, dayId, sortOrder, currency = "USD", onClose, onAdded }: Props) {
  const [type, setType] = useState<ItemType>("activity");
  const [status, setStatus] = useState<ItemStatus>("suggestion");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/days/${dayId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trip_id: tripId,
        type,
        status,
        title: title.trim(),
        detail: detail.trim() || null,
        time: time || null,
        end_time: endTime || null,
        location_name: locationName.trim() || null,
        latitude: null,
        longitude: null,
        booking_ref: bookingRef.trim() || null,
        booking_url: bookingUrl.trim() || null,
        cost: cost ? parseFloat(cost) : 0,
        currency,
        notes: notes.trim() || null,
        sort_order: sortOrder,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setError(data?.error ?? "Failed to add item");
      setSaving(false);
      return;
    }

    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl font-bold text-sand-900">Add to itinerary</h2>
            <button onClick={onClose} className="text-sand-400 hover:text-sand-600 text-sm font-medium">
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Type selector */}
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {ITEM_TYPES.map((t) => {
                  const cfg = ITEM_TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                        type === t
                          ? `${cfg.bgClass} ${cfg.accentClass} border-current`
                          : "bg-sand-50 text-sand-400 border-transparent hover:bg-sand-100"
                      )}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "flight" ? "SFO → NRT (JAL 1)" : type === "hotel" ? "Park Hyatt Tokyo" : type === "restaurant" ? "Ichiran Ramen" : "Visit Senso-ji Temple"}
                className="input w-full"
                required
                autoFocus
              />
            </div>

            {/* Detail */}
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                Detail
              </label>
              <input
                type="text"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={type === "flight" ? "Terminal 1, Gate 23" : type === "hotel" ? "Deluxe King, 2 nights" : "Optional description"}
                className="input w-full"
              />
            </div>

            {/* Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Start time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  End time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                Location
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Address or place name"
                className="input w-full"
              />
            </div>

            {/* Status + Cost row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Status
                </label>
                <div className="flex gap-1.5">
                  {STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                          status === s
                            ? `${cfg.bgClass} ${cfg.textClass}`
                            : "bg-sand-50 text-sand-400 hover:bg-sand-100"
                        )}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Cost ({currency})
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="input w-full"
                />
              </div>
            </div>

            {/* Booking ref + URL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Booking Ref
                </label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="ABC123"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Booking URL
                </label>
                <input
                  type="text"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://..."
                  className="input w-full"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details..."
                rows={2}
                className="input w-full resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Adding..." : `Add ${ITEM_TYPE_CONFIG[type].label}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
