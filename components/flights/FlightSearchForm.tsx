"use client";
import { useState } from "react";
import { FlightOffer } from "@/lib/types";
import { FlightCard } from "./FlightCard";

export function FlightSearchForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    if (!origin || !destination || !departDate) {
      setError("Please enter origin, destination, and departure date.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/flights?origin=${origin}&destination=${destination}&depart=${departDate}`);
      if (!res.ok) throw new Error("Flight search failed.");
      const data = await res.json();
      setFlights(data.flights);
    } catch {
      setError("Something went wrong while searching flights.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 mb-8">
      <h2 className="font-display text-xl font-semibold text-sand-900 mb-4">Search Flights</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input type="text" placeholder="Origin (JFK)" value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" />
        <input type="text" placeholder="Destination (NRT)" value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" />
        <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} className="input" />
        <button onClick={handleSearch} className="btn-primary">Search</button>
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {loading && <p className="text-sand-400 text-sm">Searching flights...</p>}
      <div className="space-y-3">
        {flights.length === 0 && !loading && <p className="text-sm text-sand-400 text-center py-6">Search flights to see results here</p>}
        {flights.map((flight) => <FlightCard key={flight.id} flight={flight} />)}
      </div>
    </div>
  );
}
