import { NextRequest, NextResponse } from "next/server";

// Flight comparison API route
// Person 3: Implement flight search here
//
// Options (free/cheap for hackathon):
// 1. Amadeus Self-Service API (free tier: 500 calls/mo)
//    https://developers.amadeus.com
//    npm install amadeus
//
// 2. SerpAPI Google Flights (free tier: 100 searches/mo)
//    https://serpapi.com/google-flights-api
//
// 3. Sky-Scrapper via RapidAPI (freemium)
//    https://rapidapi.com/apiheya/api/sky-scrapper

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin"); // e.g. "JFK"
  const destination = searchParams.get("destination"); // e.g. "NRT"
  const departDate = searchParams.get("depart"); // e.g. "2026-04-12"
  const returnDate = searchParams.get("return"); // e.g. "2026-04-20"
  const adults = searchParams.get("adults") || "1";

  if (!origin || !destination || !departDate) {
    return NextResponse.json(
      { error: "Missing required params: origin, destination, depart" },
      { status: 400 }
    );
  }

  // TODO: Call flight API
  // Example with Amadeus:
  //
  // import Amadeus from 'amadeus';
  // const amadeus = new Amadeus({ clientId: process.env.AMADEUS_KEY, clientSecret: process.env.AMADEUS_SECRET });
  // const response = await amadeus.shopping.flightOffersSearch.get({
  //   originLocationCode: origin,
  //   destinationLocationCode: destination,
  //   departureDate: departDate,
  //   ...(returnDate && { returnDate }),
  //   adults: parseInt(adults),
  //   max: 10,
  // });

  // Placeholder response
  return NextResponse.json({
    flights: [
      {
        id: "1",
        airline: "Delta",
        flightNumber: "DL173",
        origin,
        destination,
        departTime: "2:30 PM",
        arriveTime: "4:45 PM +1",
        duration: "14h 15m",
        stops: 0,
        price: 842,
        currency: "USD",
      },
      {
        id: "2",
        airline: "ANA",
        flightNumber: "NH109",
        origin,
        destination,
        departTime: "11:00 AM",
        arriveTime: "2:30 PM +1",
        duration: "13h 30m",
        stops: 0,
        price: 1124,
        currency: "USD",
      },
      {
        id: "3",
        airline: "United",
        flightNumber: "UA79",
        origin,
        destination,
        departTime: "6:00 PM",
        arriveTime: "9:15 PM +1",
        duration: "15h 15m",
        stops: 1,
        price: 723,
        currency: "USD",
      },
    ],
  });
}
