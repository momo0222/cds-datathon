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
  'newer_than:180d (confirmation OR reservation OR itinerary OR booking OR receipt OR "check-in" OR flight OR hotel)';

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
  const query = request.nextUrl.searchParams.get("q") || DEFAULT_QUERY;
  const maxResults = Math.min(Number(request.nextUrl.searchParams.get("max") ?? 10), 25);

  try {
    const [accessToken, trips] = await Promise.all([
      getGmailAccessToken(userData.user.id, accountId),
      loadUserTrips(userData.user.id),
    ]);

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
        const params = new URLSearchParams({ format: "metadata" });
        for (const header of ["From", "Subject", "Date"]) {
          params.append("metadataHeaders", header);
        }

        const fullMessage = await gmailFetch<GmailMessage>(
          accessToken,
          `/users/me/messages/${message.id}?${params.toString()}`
        );
        const content = extractMessageContent(fullMessage);
        const matches = tripId
          ? trips
              .filter((trip) => trip.id === tripId)
              .map((trip) => scoreEmailForTrip(content, trip))
          : rankTripsForEmail(content, trips);

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

    messages.sort((a, b) => (b.best_match?.score ?? 0) - (a.best_match?.score ?? 0));
    return NextResponse.json({ query, messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gmail search failed" },
      { status: 400 }
    );
  }
}
