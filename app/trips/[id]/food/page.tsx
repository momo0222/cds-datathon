import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripFoodPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="food" />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
                Food & Dining
              </h1>
              <p className="text-sand-400 text-sm">
                Discover restaurants and plan meals
              </p>
            </div>
            <button className="btn-primary text-sm">🔍 Search Nearby</button>
          </div>

          {/* 
            Person 3: Build restaurant discovery here
            
            Features:
            1. Search bar — query Google Places / Yelp API via /api/places
            2. Category filters: "Breakfast", "Lunch", "Dinner", "Cafe", "Street Food", "Fine Dining"
            3. Results as RestaurantCard components:
               - Photo, name, rating, cuisine type, price level, distance from hotel
               - "Add to Day X" button → creates itinerary_item with type='restaurant'
            4. "Saved" tab — restaurants already in the itinerary
            5. Map mini-view showing restaurant locations
            
            API route at /api/places:
            - Proxy to Google Places API (or use a free alternative like Overpass/OpenStreetMap)
            - Accepts: query, location (lat/lng), radius, type
            - Returns: name, rating, address, photos, place_id, lat/lng
          */}

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap mb-6">
            {["All", "Breakfast", "Lunch", "Dinner", "Café", "Street Food", "Fine Dining"].map(cat => (
              <button
                key={cat}
                className={`chip ${cat === "All" ? "bg-sand-900 text-white" : "bg-sand-100 text-sand-600 hover:bg-sand-200"} transition-colors cursor-pointer`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="card p-8 text-center animate-fade-in">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sand-400 text-sm">
              Search for restaurants at your destination and add them to your itinerary.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
