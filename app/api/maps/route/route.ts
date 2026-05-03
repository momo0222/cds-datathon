import { NextRequest, NextResponse } from "next/server";

type TravelMode = "DRIVING" | "WALKING";

interface Stop {
  lat: number;
  lng: number;
}

function parseDurationSeconds(duration: string | undefined) {
  if (!duration) return 0;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

function isStop(value: unknown): value is Stop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Stop;
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lng);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Google Routes API is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const stops = Array.isArray(body?.stops) ? body.stops : [];
  const travelMode = (body?.travelMode === "WALKING" ? "WALKING" : "DRIVING") as TravelMode;

  if (stops.length < 2 || !stops.every(isStop)) {
    return NextResponse.json({ error: "At least two valid stops are required" }, { status: 400 });
  }

  const googleTravelMode = travelMode === "WALKING" ? "WALK" : "DRIVE";
  const [origin, ...remainingStops] = stops;
  const destination = remainingStops[remainingStops.length - 1];
  const intermediates = remainingStops.slice(0, -1);

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      intermediates: intermediates.map((stop: Stop) => ({
        location: {
          latLng: {
            latitude: stop.lat,
            longitude: stop.lng,
          },
        },
      })),
      travelMode: googleTravelMode,
      computeAlternativeRoutes: false,
      polylineEncoding: "ENCODED_POLYLINE",
      polylineQuality: "HIGH_QUALITY",
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Google Routes API request failed" },
      { status: response.status }
    );
  }

  const route = data?.routes?.[0];
  if (!route) {
    return NextResponse.json({ error: "No route found for these stops" }, { status: 404 });
  }

  const legs = (route.legs ?? []).map((leg: any) => ({
    distanceMeters: leg.distanceMeters ?? 0,
    durationSeconds: parseDurationSeconds(leg.duration),
  }));

  const distanceMeters =
    route.distanceMeters ?? legs.reduce((total: number, leg: { distanceMeters: number }) => total + leg.distanceMeters, 0);
  const durationSeconds =
    parseDurationSeconds(route.duration) ||
    legs.reduce((total: number, leg: { durationSeconds: number }) => total + leg.durationSeconds, 0);

  return NextResponse.json({
    distanceMeters,
    durationSeconds,
    encodedPolyline: route.polyline?.encodedPolyline ?? null,
    legs,
  });
}
