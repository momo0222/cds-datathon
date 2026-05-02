import Link from "next/link";
import { Trip, TripMember } from "@/lib/types";
import { formatDateRange, initials } from "@/lib/utils";
import { DeleteTripButton } from "@/components/trip/DeleteTripButton";

interface Props {
  trip: Trip & { members?: (TripMember & { profile?: { full_name: string } })[] };
  canDelete?: boolean;
}

export function TripCard({ trip, canDelete = false }: Props) {
  const memberNames = trip.members?.map(m => m.profile?.full_name || "?") || [];

  return (
    <div
      className="group border border-sand-100 bg-white shadow-[0_1px_2px_rgba(24,40,28,0.04),0_16px_36px_rgba(29,158,117,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sand-200 hover:shadow-[0_2px_6px_rgba(24,40,28,0.06),0_20px_44px_rgba(29,158,117,0.11)]"
      style={{ borderLeftColor: trip.color, borderLeftWidth: 4 }}
    >
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start">
        <Link href={`/trips/${trip.id}`} className="min-w-0">
          <div className="flex gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm text-3xl"
              style={{ background: `${trip.color}14` }}
            >
              {trip.cover_emoji}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-semibold leading-tight text-sand-900 transition-colors group-hover:text-ocean-dark">
                {trip.name}
              </h3>
              <p className="mt-1 text-sm text-sand-500">{trip.destination}</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {memberNames.slice(0, 4).map((name, i) => (
                    <div
                      key={i}
                      className="flex h-7 w-7 items-center justify-center border-2 border-white text-[10px] font-bold text-white"
                      style={{ background: trip.color, zIndex: 10 - i }}
                    >
                      {initials(name)}
                    </div>
                  ))}
                  {memberNames.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center border-2 border-white bg-sand-200 text-[10px] font-bold text-sand-600">
                      +{memberNames.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-sand-400">
                  {memberNames.length} traveler{memberNames.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
          <span className="whitespace-nowrap bg-sand-50 px-3 py-1.5 font-mono text-xs text-sand-500">
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
          {canDelete && <DeleteTripButton tripId={trip.id} tripName={trip.name} />}
        </div>
      </div>
    </div>
  );
}
