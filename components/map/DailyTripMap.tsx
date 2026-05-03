"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Day, ItineraryItem } from "@/lib/types";

type DayWithItems = Day & { items?: ItineraryItem[] };
type TravelMode = "DRIVING" | "WALKING";

interface MappedStop {
  item: ItineraryItem;
  position: { lat: number; lng: number };
}

interface RouteSummary {
  distanceText: string;
  durationText: string;
  isEstimate?: boolean;
  longestLeg?: {
    from: string;
    to: string;
    distanceText: string;
    durationText: string;
  };
  error?: string;
}

interface RouteApiResponse {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string | null;
  legs: {
    distanceMeters: number;
    durationSeconds: number;
  }[];
  error?: string;
}

declare global {
  interface Window {
    google?: any;
    __trvlGoogleMapsPromise?: Promise<void>;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js";
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const METERS_PER_MILE = 1609.344;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__trvlGoogleMapsPromise) return window.__trvlGoogleMapsPromise;

  window.__trvlGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return window.__trvlGoogleMapsPromise;
}

function stopName(item: ItineraryItem) {
  return item.location_name || item.title;
}

function sortItems(items: ItineraryItem[]) {
  return items.slice().sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

function formatMeters(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return "0 mi";
  const miles = meters / METERS_PER_MILE;
  return miles >= 10 ? `${Math.round(miles)} mi` : `${miles.toFixed(1)} mi`;
}

function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function decodePolyline(encoded: string) {
  const path: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return path;
}

function distanceBetweenMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const earthRadiusMeters = 6371000;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDurationSeconds(distanceMeters: number, travelMode: TravelMode) {
  const mph = travelMode === "WALKING" ? 3 : 25;
  return Math.round((distanceMeters / METERS_PER_MILE / mph) * 60 * 60);
}

export function DailyTripMap({ day }: { day?: DayWithItems }) {
  const [travelMode, setTravelMode] = useState<TravelMode>("DRIVING");
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RouteSummary | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const usePaidRoutes = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_ROUTES === "true";

  const sortedItems = useMemo(() => {
    return sortItems(day?.items ?? []);
  }, [day]);

  const mappedStops = useMemo<MappedStop[]>(() => {
    return sortedItems
      .filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number")
      .map((item) => ({
        item,
        position: { lat: item.latitude as number, lng: item.longitude as number },
      }));
  }, [sortedItems]);

  const missingLocationCount = sortedItems.length - mappedStops.length;

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;
    setLoadError(null);

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Google Maps could not load.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!isReady || !mapRef.current || mapInstanceRef.current || !window.google?.maps) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [isReady]);

  useEffect(() => {
    const google = window.google;
    const map = mapInstanceRef.current;
    if (!isReady || !google?.maps || !map) return;

    const controller = new AbortController();
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;
    setSummary(null);

    if (mappedStops.length === 0) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(4);
      return () => controller.abort();
    }

    const bounds = new google.maps.LatLngBounds();

    mappedStops.forEach((stop, index) => {
      bounds.extend(stop.position);
      const marker = new google.maps.Marker({
        map,
        position: stop.position,
        title: stopName(stop.item),
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "700",
        },
      });
      markersRef.current.push(marker);
    });

    if (mappedStops.length === 1) {
      map.fitBounds(bounds);
      map.setZoom(13);
      setSummary({
        distanceText: "0 mi",
        durationText: "0 min",
      });
      return () => controller.abort();
    }

    map.fitBounds(bounds);

    if (!usePaidRoutes) {
      const path = mappedStops.map((stop) => stop.position);
      routePolylineRef.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: "#1d9e75",
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });

      const legs = mappedStops.slice(0, -1).map((stop, index) => {
        const distanceMeters = distanceBetweenMeters(stop.position, mappedStops[index + 1].position);
        return {
          distanceMeters,
          durationSeconds: estimateDurationSeconds(distanceMeters, travelMode),
        };
      });

      const totals = legs.reduce(
        (acc, leg) => ({
          distanceMeters: acc.distanceMeters + leg.distanceMeters,
          durationSeconds: acc.durationSeconds + leg.durationSeconds,
        }),
        { distanceMeters: 0, durationSeconds: 0 }
      );

      const longest = legs.reduce(
        (current: { leg: (typeof legs)[number]; index: number } | null, leg, index) => {
          if (!current || leg.distanceMeters > current.leg.distanceMeters) {
            return { leg, index };
          }
          return current;
        },
        null
      );

      setSummary({
        distanceText: formatMeters(totals.distanceMeters),
        durationText: formatSeconds(totals.durationSeconds),
        isEstimate: true,
        longestLeg:
          longest && mappedStops[longest.index + 1]
            ? {
                from: stopName(mappedStops[longest.index].item),
                to: stopName(mappedStops[longest.index + 1].item),
                distanceText: formatMeters(longest.leg.distanceMeters),
                durationText: formatSeconds(longest.leg.durationSeconds),
              }
            : undefined,
      });

      return () => controller.abort();
    }

    fetch("/api/maps/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        stops: mappedStops.map((stop) => stop.position),
        travelMode,
      }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as RouteApiResponse | null;
        if (!response.ok) {
          throw new Error(data?.error || "Route distance is unavailable for these stops.");
        }
        return data;
      })
      .then((route) => {
        if (!route || controller.signal.aborted) return;

        if (route.encodedPolyline) {
          const path = decodePolyline(route.encodedPolyline);
          routePolylineRef.current = new google.maps.Polyline({
            map,
            path,
            strokeColor: "#1d9e75",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          });

          const routeBounds = new google.maps.LatLngBounds();
          path.forEach((point) => routeBounds.extend(point));
          mappedStops.forEach((stop) => routeBounds.extend(stop.position));
          map.fitBounds(routeBounds);
        }

        const longest = route.legs.reduce(
          (current: { leg: RouteApiResponse["legs"][number]; index: number } | null, leg, index) => {
            if (!current || leg.distanceMeters > current.leg.distanceMeters) {
              return { leg, index };
            }
            return current;
          },
          null
        );

        setSummary({
          distanceText: formatMeters(route.distanceMeters),
          durationText: formatSeconds(route.durationSeconds),
          longestLeg:
            longest && mappedStops[longest.index + 1]
              ? {
                  from: stopName(mappedStops[longest.index].item),
                  to: stopName(mappedStops[longest.index + 1].item),
                  distanceText: formatMeters(longest.leg.distanceMeters),
                  durationText: formatSeconds(longest.leg.durationSeconds),
                }
              : undefined,
        });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        map.fitBounds(bounds);
        setSummary({
          distanceText: "Unavailable",
          durationText: "Unavailable",
          error: error.message || "Route distance is unavailable for these stops.",
        });
      });

    return () => controller.abort();
  }, [isReady, mappedStops, travelMode, usePaidRoutes]);

  if (!day) return null;

  return (
    <section className="mb-4 border-l-[3px] border-ocean bg-white shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_45px_rgba(29,158,117,0.08)]">
      <div className="flex flex-col gap-4 border-b border-sand-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ocean-dark">Daily route</p>
          <h2 className="mt-1 text-lg font-semibold text-sand-900">Map commute</h2>
        </div>
        <div className="flex w-fit rounded-sm border border-sand-200 p-1 text-xs font-medium">
          {(["DRIVING", "WALKING"] as TravelMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTravelMode(mode)}
              className={`rounded-[3px] px-3 py-1.5 transition-colors ${
                travelMode === mode ? "bg-ocean text-white" : "text-sand-500 hover:text-sand-900"
              }`}
            >
              {mode === "DRIVING" ? "Drive" : "Walk"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {!apiKey ? (
          <div className="flex h-[280px] items-center justify-center border border-dashed border-sand-200 bg-sand-50 px-5 text-center text-sm text-sand-500 md:h-[340px]">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.
          </div>
        ) : loadError ? (
          <div className="flex h-[280px] items-center justify-center border border-dashed border-coral/50 bg-coral/5 px-5 text-center text-sm text-coral md:h-[340px]">
            {loadError}
          </div>
        ) : (
          <div ref={mapRef} className="h-[280px] w-full border border-sand-200 bg-sand-50 md:h-[340px]" />
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border border-sand-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-sand-400">Distance</p>
            <p className="mt-1 text-2xl font-semibold text-sand-900">{summary?.distanceText ?? "--"}</p>
          </div>
          <div className="border border-sand-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-sand-400">Time</p>
            <p className="mt-1 text-2xl font-semibold text-sand-900">{summary?.durationText ?? "--"}</p>
          </div>
        </div>

        {summary?.isEstimate && (
          <p className="mt-3 text-xs text-sand-500">
            Estimated with straight-line distance. Turn on Routes API only when road-level commute times are needed.
          </p>
        )}

        {summary?.error && <p className="mt-3 text-xs text-coral">{summary.error}</p>}

        {missingLocationCount > 0 && (
          <p className="mt-3 text-xs text-sand-500">
            {missingLocationCount} item{missingLocationCount === 1 ? "" : "s"} need coordinates before they can appear
            on the map.
          </p>
        )}

        {summary?.longestLeg && (
          <div className="mt-4 border-l-[3px] border-amber bg-amber/5 px-4 py-3 text-sm">
            <p className="font-medium text-sand-900">Optimization hint</p>
            <p className="mt-1 text-sand-600">
              Longest commute: {summary.longestLeg.from} to {summary.longestLeg.to} (
              {summary.longestLeg.distanceText}, {summary.longestLeg.durationText}). Try moving one stop or choosing a
              closer option nearby.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
