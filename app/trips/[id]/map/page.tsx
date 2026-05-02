import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";

interface Props {
  params: Promise<{ id: string }>;
}

// TODO: Fetch itinerary items with lat/lng for map pins + route
// const supabase = createServerSupabase()
// const { data: items } = await supabase.from('itinerary_items')
//   .select('*')
//   .eq('trip_id', params.id)
//   .not('latitude', 'is', null)
//   .order('sort_order')

export default async function TripMapPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="map" />
        <main className="flex-1 relative">
          {/* Full-bleed map — Person 2 builds with react-map-gl */}
          <div className="w-full h-[calc(100vh-64px)] bg-sand-100 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <p className="text-4xl mb-3">🗺️</p>
              <h2 className="font-display text-xl font-semibold text-sand-700 mb-1">
                Trip Map
              </h2>
              <p className="text-sand-400 text-sm max-w-xs">
                Visualize your route Strava-style. Add your Mapbox token in{" "}
                <code className="font-mono text-xs bg-sand-100 px-1.5 py-0.5 rounded">
                  .env.local
                </code>{" "}
                to get started.
              </p>
            </div>
          </div>

          {/* 
            Person 2: Implement TripMap component here
            
            Key features:
            - Plot all itinerary_items with lat/lng as markers
            - Color-code markers by item type (flight=blue, food=red, etc.)
            - Draw route lines between sequential stops per day
            - Sidebar panel showing day-by-day with clickable items that fly to location
            - Strava-style "trip summary" overlay: total distance, countries, cities
            
            Example setup:
            
            import Map, { Marker, Source, Layer } from 'react-map-gl';
            import 'mapbox-gl/dist/mapbox-gl.css';
            
            <Map
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              initialViewState={{ longitude: 139.6917, latitude: 35.6895, zoom: 11 }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/light-v11"
            >
              {items.map(item => (
                <Marker key={item.id} longitude={item.longitude} latitude={item.latitude}>
                  <div className="...">{ITEM_TYPE_CONFIG[item.type].icon}</div>
                </Marker>
              ))}
              <Source type="geojson" data={routeGeoJSON}>
                <Layer type="line" paint={{ 'line-color': '#2D5A8E', 'line-width': 3 }} />
              </Source>
            </Map>
          */}
        </main>
      </div>
    </>
  );
}
