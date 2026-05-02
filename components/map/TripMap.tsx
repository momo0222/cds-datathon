"use client";

// Person 2: Implement Mapbox map here
//
// npm install react-map-gl mapbox-gl
// Don't forget: import 'mapbox-gl/dist/mapbox-gl.css' in layout or this file
//
// Example implementation:
//
// import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';
// import { ItineraryItem, ITEM_TYPE_CONFIG } from '@/lib/types';
//
// interface Props {
//   items: ItineraryItem[];
//   center?: { lat: number; lng: number };
// }
//
// export function TripMap({ items, center }: Props) {
//   const geoItems = items.filter(i => i.latitude && i.longitude);
//
//   // Build GeoJSON route line from sequential items
//   const routeGeoJSON = {
//     type: 'Feature' as const,
//     geometry: {
//       type: 'LineString' as const,
//       coordinates: geoItems.map(i => [i.longitude!, i.latitude!]),
//     },
//     properties: {},
//   };
//
//   return (
//     <Map
//       mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
//       initialViewState={{
//         longitude: center?.lng || geoItems[0]?.longitude || 0,
//         latitude: center?.lat || geoItems[0]?.latitude || 0,
//         zoom: 12,
//       }}
//       style={{ width: '100%', height: '100%' }}
//       mapStyle="mapbox://styles/mapbox/light-v11"
//     >
//       <NavigationControl position="top-right" />
//
//       {/* Route line */}
//       {geoItems.length >= 2 && (
//         <Source type="geojson" data={routeGeoJSON}>
//           <Layer
//             type="line"
//             paint={{
//               'line-color': '#2D5A8E',
//               'line-width': 3,
//               'line-dasharray': [2, 1],
//             }}
//           />
//         </Source>
//       )}
//
//       {/* Markers */}
//       {geoItems.map(item => (
//         <Marker key={item.id} longitude={item.longitude!} latitude={item.latitude!}>
//           <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-sm cursor-pointer hover:scale-110 transition-transform">
//             {ITEM_TYPE_CONFIG[item.type].icon}
//           </div>
//         </Marker>
//       ))}
//     </Map>
//   );
// }

export function TripMap() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-sand-50">
      <p className="text-sand-400 text-sm">Map component — add Mapbox token to activate</p>
    </div>
  );
}
