import Link from "next/link";
import { Trip, TripMember } from "@/lib/types";
import { formatDateRange, initials } from "@/lib/utils";

interface Props {
  trip: Trip & { members?: (TripMember & { profile?: { full_name: string } })[] };
}

export function TripCard({ trip }: Props) {
  const memberNames = trip.members?.map(m => m.profile?.full_name || "?") || [];

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="card overflow-hidden cursor-pointer group">
        {/* Color accent bar */}
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${trip.color}, ${trip.color}aa)` }}
        />

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${trip.color}12` }}
              >
                {trip.cover_emoji}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-sand-900 group-hover:text-ocean transition-colors">
                  {trip.name}
                </h3>
                <p className="text-sm text-sand-400">{trip.destination}</p>
              </div>
            </div>
            <span className="font-mono text-xs text-sand-400 bg-sand-50 px-3 py-1.5 rounded-lg">
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-4">
            {/* Member avatars */}
            <div className="flex -space-x-2">
              {memberNames.slice(0, 4).map((name, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: trip.color, zIndex: 10 - i }}
                >
                  {initials(name)}
                </div>
              ))}
              {memberNames.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-sand-200 flex items-center justify-center text-[10px] font-bold text-sand-500">
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
  );
}
