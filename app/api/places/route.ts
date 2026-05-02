import { NextRequest, NextResponse } from "next/server";

// Places / restaurant search API route
// Person 3: Implement place search here
//
// Options:
// 1. Google Places API (Nearby Search + Place Details)
//    $200 free credit/month — more than enough for dev
//
// 2. Foursquare Places API (free tier: 100K calls/mo)
//    https://developer.foursquare.com
//
// 3. Overpass API (OpenStreetMap, fully free)
//    https://overpass-api.de

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "1500"; // meters
  const type = searchParams.get("type") || "restaurant";

  if (!query && (!lat || !lng)) {
    return NextResponse.json(
      { error: "Provide either 'query' or 'lat' + 'lng'" },
      { status: 400 }
    );
  }

  // TODO: Call places API
  // Example with Google Places:
  //
  // const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&keyword=${query}&key=${process.env.GOOGLE_PLACES_KEY}`;
  // const res = await fetch(url);
  // const data = await res.json();

  // Placeholder
  return NextResponse.json({
    places: [
      {
        id: "place_1",
        name: "Afuri Ramen Harajuku",
        rating: 4.5,
        price_level: 2,
        cuisine: "Japanese · Ramen",
        address: "1-17-1 Jingumae, Shibuya",
        latitude: 35.6702,
        longitude: 139.7045,
        photo_url: null,
        open_now: true,
      },
      {
        id: "place_2",
        name: "Gonpachi Nishi-Azabu",
        rating: 4.3,
        price_level: 3,
        cuisine: "Japanese · Izakaya",
        address: "1-13-11 Nishi-Azabu, Minato",
        latitude: 35.6567,
        longitude: 139.7261,
        photo_url: null,
        open_now: true,
      },
    ],
  });
}
