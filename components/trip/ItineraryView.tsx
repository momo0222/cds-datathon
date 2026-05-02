"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Day, ItineraryItem, Trip } from "@/lib/types";
import { DayTabs } from "@/components/trip/DayTabs";
import { ItineraryItemCard } from "@/components/trip/ItineraryItemCard";
import { AddItemModal } from "@/components/trip/AddItemModal";
import { EditItemModal } from "@/components/trip/EditItemModal";
import { SmartImportPanel } from "@/components/trip/SmartImportPanel";
import { ImportReviewPanel } from "@/components/trip/ImportReviewPanel";
import { TripAgentPanel } from "@/components/trip/TripAgentPanel";
import { ReviewProposal } from "@/components/trip/proposalDraftStore";

type TripWithDays = Trip & { days?: (Day & { items?: ItineraryItem[] })[] };

interface Props {
  trip: TripWithDays;
  canEdit?: boolean;
}

export function ItineraryView({ trip, canEdit = true }: Props) {
  const router = useRouter();
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
  const [incomingProposals, setIncomingProposals] = useState<ReviewProposal[]>([]);

  function addIncomingProposals(proposals: ReviewProposal[]) {
    setIncomingProposals((current) => {
      const byId = new Map(current.map((proposal) => [proposal.id, proposal]));
      proposals.forEach((proposal) => byId.set(proposal.id, proposal));
      return Array.from(byId.values());
    });
  }

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
          <div className="border-l-[3px] border-ocean bg-white px-5 py-4 text-sm text-sand-500 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_45px_rgba(29,158,117,0.08)]">
            No days yet.
          </div>
        )}
      </div>

      {/* AI Tools */}
      {canEdit && (
        <>
          <SmartImportPanel
            tripId={trip.id}
            currency={trip.currency ?? "USD"}
            onImported={addIncomingProposals}
          />
          <ImportReviewPanel
            tripId={trip.id}
            currency={trip.currency ?? "USD"}
            incomingProposals={incomingProposals}
            onChanged={() => router.refresh()}
          />
        </>
      )}

      <div className="flex flex-col gap-3 mt-4">
        {items.length === 0 && activeDay && (
          <div className="border-l-[3px] border-coral bg-white px-5 py-8 text-center shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_45px_rgba(239,159,39,0.08)]">
            <p className="text-sm text-sand-500">No items yet for this day. Add your first one.</p>
          </div>
        )}

        {items.map((item) => (
          <ItineraryItemCard key={item.id} item={item} onClick={canEdit ? () => setEditingItem(item) : undefined} />
        ))}

        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            disabled={!activeDay}
            className="w-full rounded-sm border-2 border-dashed border-sand-200 py-4 text-sm font-medium text-sand-400 transition-colors hover:border-ocean hover:text-ocean disabled:opacity-60"
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
          onAdded={() => router.refresh()}
        />
      )}

      {canEdit && editingItem && (
        <EditItemModal
          item={editingItem}
          currency={trip.currency ?? "USD"}
          onClose={() => setEditingItem(null)}
          onSaved={() => router.refresh()}
          onDeleted={() => router.refresh()}
        />
      )}

      {canEdit && <TripAgentPanel trip={trip} onProposals={addIncomingProposals} />}
    </>
  );
}
