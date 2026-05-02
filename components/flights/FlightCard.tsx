import { FlightOffer } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/*
  Props definition for the FlightCard component.

  We expect one flight object that follows the FlightOffer interface
  we defined earlier in lib/types.ts.
*/
interface Props {
  flight: FlightOffer;
}

/*
  Helper function to convert the numeric stops value
  into a more user-friendly label.

  Example:
  0 → "Direct"
  1 → "1 stop"
  2 → "2 stops"
*/
function formatStops(stops: number) {
  if (stops === 0) return "Direct";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

/*
  FlightCard Component

  This component is responsible only for DISPLAYING flight data.
  It does NOT fetch data or handle search logic.

  Later we may add:
  - "Add to trip" button
  - booking links
  - airline logos
*/
export function FlightCard({ flight }: Props) {
  return (
    <div className="card p-5 flex items-center justify-between animate-fade-in">

      {/* LEFT SIDE — Flight details */}
      <div>

        {/* Airline + Flight Number */}
        <p className="font-display text-lg font-semibold text-sand-900">
          {flight.airline} {flight.flightNumber}
        </p>

        {/* Route */}
        <p className="text-sm text-sand-400 mb-2">
          {flight.origin} → {flight.destination}
        </p>

        {/* Departure and Arrival */}
        <p className="font-mono text-sm text-sand-700">
          {flight.departTime} → {flight.arriveTime}
        </p>

        {/* Duration + Stops */}
        <p className="text-xs text-sand-400 mt-1">
          {flight.duration} • {formatStops(flight.stops)}
        </p>
      </div>

      {/* RIGHT SIDE — Price */}
      <div className="text-right">

        {/* Flight Price */}
        <p className="font-display text-xl font-bold text-sand-900">
          {formatCurrency(flight.price, flight.currency)}
        </p>

        {/* Price note */}
        <p className="text-xs text-sand-400">
          per traveler
        </p>
      </div>
    </div>
  );
}