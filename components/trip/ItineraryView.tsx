"use client";

import { useMemo, useState } from "react";
import { Day, ItineraryItem, Trip } from "@/lib/types";
import { DayTabs } from "@/components/trip/DayTabs";
import { ItineraryItemCard } from "@/components/trip/ItineraryItemCard";
import { AddItemModal } from "@/components/trip/AddItemModal";
import { EditItemModal } from "@/components/trip/EditItemModal";
import { SmartImportPanel } from "@/components/trip/SmartImportPanel";

type TripWithDays = Trip & { days?: (Day & { items?: ItineraryItem[] })[] };

interface Props {
  trip: TripWithDays;
  canEdit?: boolean;
}

export function ItineraryView({ trip, canEdit = true }: Props) {
  const days = trip.days ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeDay = days[activeIndex];

  const items = useMemo(() => {
    return (activeDay?.items ?? []).slice().sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
  }, [activeDay]);

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  return (
    <>
      <div className="mb-6">
        {days.length > 0 ? (
          <DayTabs
            days={days}
            activeIndex={Math.min(activeIndex, Math.max(days.length - 1, 0))}
            onSelect={setActiveIndex}
            accentColor={trip.color}
          />
        ) : (
          <div className="card p-4 text-sand-400 text-sm">No days yet.</div>
        )}
      </div>

      {/* AI Tools */}
      {canEdit && (
        <SmartImportPanel
          tripId={trip.id}
          currency={trip.currency ?? "USD"}
          onImported={() => window.location.reload()}
        />
      )}

      <div className="flex flex-col gap-3 mt-4">
        {items.length === 0 && activeDay && (
          <div className="card p-8 text-center">
            <p className="text-sand-400 text-sm">No items yet for this day. Add your first one!</p>
          </div>
        )}

        {items.map((item) => (
          <ItineraryItemCard key={item.id} item={item} onClick={canEdit ? () => setEditingItem(item) : undefined} />
        ))}

        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            disabled={!activeDay}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-sand-200 text-sand-400 text-sm font-medium hover:border-ocean hover:text-ocean transition-colors disabled:opacity-60"
          >
            + Add flight, hotel, activity, or restaurant
          </button>
        )}
      </div>

      {canEdit && showAdd && activeDay && (
        <AddItemModal
          tripId={trip.id}
          dayId={activeDay.id}
          sortOrder={items.length}
          currency={trip.currency ?? "USD"}
          onClose={() => setShowAdd(false)}
          onAdded={() => window.location.reload()}
        />
      )}

      {canEdit && editingItem && (
        <EditItemModal
          item={editingItem}
          currency={trip.currency ?? "USD"}
          onClose={() => setEditingItem(null)}
          onSaved={() => window.location.reload()}
          onDeleted={() => window.location.reload()}
        />
      )}
    </>
  );
}
