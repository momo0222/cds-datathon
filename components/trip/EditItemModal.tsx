"use client";

import { useState } from "react";
import { ItineraryItem, ItemType, ItemStatus, ITEM_TYPE_CONFIG, STATUS_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  item: ItineraryItem;
  currency?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const ITEM_TYPES: ItemType[] = ["flight", "hotel", "transport", "activity", "restaurant"];
const STATUSES: ItemStatus[] = ["confirmed", "pending", "suggestion", "cancelled"];

export function EditItemModal({ item, currency = "USD", onClose, onSaved, onDeleted }: Props) {
  const [type, setType] = useState<ItemType>(item.type);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [title, setTitle] = useState(item.title);
  const [detail, setDetail] = useState(item.detail ?? "");
  const [time, setTime] = useState(item.time ?? "");
  const [endTime, setEndTime] = useState(item.end_time ?? "");
  const [locationName, setLocationName] = useState(item.location_name ?? "");
  const [bookingRef, setBookingRef] = useState(item.booking_ref ?? "");
  const [bookingUrl, setBookingUrl] = useState(item.booking_url ?? "");
  const [cost, setCost] = useState(item.cost ? String(item.cost) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        status,
        title: title.trim(),
        detail: detail.trim() || null,
        time: time || null,
        end_time: endTime || null,
        location_name: locationName.trim() || null,
        booking_ref: bookingRef.trim() || null,
        booking_url: bookingUrl.trim() || null,
        cost: cost ? parseFloat(cost) : 0,
        notes: notes.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setError(data?.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    onSaved();
  }

  async function handleDelete() {
    if (!confirm("Delete this item?")) return;
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setError(data?.error ?? "Failed to delete");
      setDeleting(false);
      return;
    }

    onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl font-bold text-sand-900">Edit item</h2>
            <button onClick={onClose} className="text-sand-400 hover:text-sand-600 text-sm font-medium">
              Close
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
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
                className="input w-full"
                required
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
                className="input w-full"
              />
            </div>

            {/* Status + Cost row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[11px] text-sand-400 uppercase tracking-widest mb-2 block">
                  Status
                </label>
                <div className="flex gap-1.5 flex-wrap">
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
                rows={2}
                className="input w-full resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="btn-primary flex-1 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleting ? "..." : "Delete"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
