import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole } from "@/lib/check-role";
import { getGmailAccessToken, gmailFetch } from "@/lib/gmail";
import { extractMessageContent, GmailMessage } from "@/lib/gmail-message";
import { rankTripsForEmail, scoreEmailForTrip, TripMatchTrip } from "@/lib/trip-match";

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
};

const DEFAULT_QUERY =
  'newer_than:365d (confirmation OR reservation OR itinerary OR booking OR receipt OR "boarding pass" OR "e-ticket" OR "your flight" OR "your trip") -newsletter -sale -savings -promo -promotion -apartment -apartments -leasing -grant';

function escapeGmailQueryTerm(value: string) {
  return value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}

function destinationTerms(destination: string) {
  const clean = escapeGmailQueryTerm(destination);
  const tokens = clean
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .slice(0, 3);

  return [clean, ...tokens].filter(Boolean);
}

function buildTripAwareQuery(trip?: TripMatchTrip | null) {
  if (!trip) return DEFAULT_QUERY;

  const destinations = destinationTerms(trip.destination);
  const destinationQuery = destinations.length > 0
    ? `(${destinations.map((term) => `"${term}"`).join(" OR ")})`
    : "";

  return [
    'newer_than:365d',
    '(confirmation OR reservation OR itinerary OR booking OR receipt OR "boarding pass" OR "e-ticket" OR "your flight" OR "your stay" OR "confirmed")',
    destinationQuery,
    '-newsletter',
    '-sale',
    '-savings',
    '-promo',
    '-promotion',
    '-unsubscribe',
    '-apartment',
    '-apartments',
    '-leasing',
    '-grant',
  ].filter(Boolean).join(" ");
}

async function loadUserTrips(userId: string) {
  const admin = createAdminSupabase();
  const { data: memberRows, error: memberError } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", userId);

  if (memberError) throw new Error(memberError.message);

  const memberTripIds = (memberRows ?? []).map((row) => row.trip_id).filter(Boolean);
  const { data: ownedTrips, error: ownedError } = await admin
    .from("trips")
    .select("id,name,destination,start_date,end_date")
    .eq("owner_id", userId);

  if (ownedError) throw new Error(ownedError.message);

  let memberTrips: TripMatchTrip[] = [];
  if (memberTripIds.length > 0) {
    const { data, error } = await admin
      .from("trips")
      .select("id,name,destination,start_date,end_date")
      .in("id", memberTripIds);
    if (error) throw new Error(error.message);
    memberTrips = data ?? [];
  }

  return Array.from(
    new Map([...(ownedTrips ?? []), ...memberTrips].map((trip) => [trip.id, trip])).values()
  ) as TripMatchTrip[];
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tripId = request.nextUrl.searchParams.get("trip_id");
  if (tripId) {
    const role = await getTripRole(tripId, userData.user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const accountId = request.nextUrl.searchParams.get("account_id");
  const maxResults = Math.min(Number(request.nextUrl.searchParams.get("max") ?? 20), 50);
  const minScore = Number(request.nextUrl.searchParams.get("min_score") ?? 0.3);
  const includeLowConfidence = request.nextUrl.searchParams.get("include_low") === "true";

  try {
    const [accessToken, trips] = await Promise.all([
      getGmailAccessToken(userData.user.id, accountId),
      loadUserTrips(userData.user.id),
    ]);
    const targetTrip = tripId ? trips.find((trip) => trip.id === tripId) ?? null : null;
    const query = request.nextUrl.searchParams.get("q") || buildTripAwareQuery(targetTrip);

    const searchParams = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
    });

    const list = await gmailFetch<GmailListResponse>(
      accessToken,
      `/users/me/messages?${searchParams.toString()}`
    );

    const messages = await Promise.all(
      (list.messages ?? []).map(async (message) => {
        const params = new URLSearchParams({ format: "full" });

        const fullMessage = await gmailFetch<GmailMessage>(
          accessToken,
          `/users/me/messages/${message.id}?${params.toString()}`
        );
        const content = extractMessageContent(fullMessage);
        const matches = tripId
          ? trips
              .filter((trip) => trip.id === tripId)
              .map((trip) => scoreEmailForTrip(content, trip))
              .filter((match) => includeLowConfidence || match.score >= minScore)
          : rankTripsForEmail(content, trips, { minScore, limit: 3 });

        return {
          id: content.id,
          thread_id: content.thread_id,
          from: content.from,
          subject: content.subject,
          date: content.date,
          received_at: content.received_at,
          snippet: content.snippet,
          matches,
          best_match: matches[0] ?? null,
        };
      })
    );

    const filteredMessages = messages
      .filter((message) => includeLowConfidence || Boolean(message.best_match))
      .sort((a, b) => (b.best_match?.score ?? 0) - (a.best_match?.score ?? 0));

    return NextResponse.json({
      query,
      min_score: minScore,
      messages: filteredMessages,
      filtered_out: messages.length - filteredMessages.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail search failed";
    if (message.toLowerCase().includes("insufficient authentication scopes")) {
      return NextResponse.json(
        {
          error: "Gmail is connected, but TRVL does not have Gmail read permission. Disconnect Gmail, remove TRVL from your Google account permissions, then connect Gmail again.",
          needs_reconnect: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
