export type TripMatchConfidence = "high" | "medium" | "low" | "none";

export interface TripMatchTrip {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export interface TripMatchEmail {
  subject?: string | null;
  from?: string | null;
  snippet?: string | null;
  body?: string | null;
  received_at?: string | null;
}

export interface TripMatchResult {
  trip_id: string;
  trip_name: string;
  destination: string;
  score: number;
  confidence: TripMatchConfidence;
  reasons: string[];
  matched_dates: string[];
}

const TRAVEL_TERMS = [
  "booking",
  "confirmation",
  "confirmed",
  "reservation",
  "itinerary",
  "receipt",
  "check-in",
  "flight",
  "hotel",
  "airbnb",
  "boarding",
  "boarding pass",
  "ticket",
  "e-ticket",
  "e ticket",
];

const TRAVEL_SENDERS = [
  "airbnb",
  "booking",
  "expedia",
  "hotels.com",
  "air canada",
  "aircanada",
  "delta",
  "united",
  "american airlines",
  "southwest",
  "jetblue",
  "alaska",
  "hilton",
  "marriott",
  "hyatt",
  "resy",
  "opentable",
  "ticketmaster",
  "eventbrite",
];

const PROMOTIONAL_TERMS = [
  "newsletter",
  "savings",
  "deals",
  "offer",
  "offers",
  "escape",
  "getaway",
  "getaways",
  "adventure",
  "adventures",
  "pre-order",
  "preorder",
  "weekly",
  "photo newsletter",
];

const NON_TRAVEL_CONFIRMATION_TERMS = [
  "grant",
  "apartment",
  "apartments",
  "lease",
  "leasing",
  "landlord",
  "housing search",
  "furnished finder",
  "inquiry",
];

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function clampScore(score: number) {
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLocation(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["the", "and", "for", "trip"].includes(token));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a: Date, b: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aUtc - bUtc) / dayMs);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function extractDates(text: string, fallbackYear?: number) {
  const dates = new Set<string>();

  // Format: 2026-06-07 or 2026/06/07
  const numericDateRegex = /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g;
  let numericMatch: RegExpExecArray | null;
  while ((numericMatch = numericDateRegex.exec(text)) !== null) {
    const [, year, month, day] = numericMatch;
    if (!year || !month || !day) continue;
    dates.add(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }

  const monthPattern = Object.keys(MONTHS).join("|");
  // Format: "June 7, 2026" or "Jun 7 2026" (Month Day Year)
  const monthFirstRegex = new RegExp(
    `\\b(${monthPattern})\\.?\\s+([0-3]?\\d)(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`,
    "gi"
  );

  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = monthFirstRegex.exec(text)) !== null) {
    const monthName = namedMatch[1]?.toLowerCase().replace(".", "");
    const day = Number(namedMatch[2]);
    const year = Number(namedMatch[3] ?? fallbackYear);
    if (!monthName || !year || day < 1 || day > 31) continue;

    const date = new Date(Date.UTC(year, MONTHS[monthName], day));
    if (!Number.isNaN(date.getTime())) {
      dates.add(dateOnly(date));
    }
  }

  // Format: "7 June 2026" or "07 Jun 2026" (Day Month Year)
  const dayFirstRegex = new RegExp(
    `\\b([0-3]?\\d)(?:st|nd|rd|th)?\\s+(${monthPattern})\\.?(?:,?\\s+(20\\d{2}))?\\b`,
    "gi"
  );

  while ((namedMatch = dayFirstRegex.exec(text)) !== null) {
    const day = Number(namedMatch[1]);
    const monthName = namedMatch[2]?.toLowerCase().replace(".", "");
    const year = Number(namedMatch[3] ?? fallbackYear);
    if (!monthName || !year || day < 1 || day > 31) continue;

    const date = new Date(Date.UTC(year, MONTHS[monthName], day));
    if (!Number.isNaN(date.getTime())) {
      dates.add(dateOnly(date));
    }
  }

  return Array.from(dates).sort();
}

function getConfidence(score: number): TripMatchConfidence {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  if (score >= 0.2) return "low";
  return "none";
}

export function scoreEmailForTrip(email: TripMatchEmail, trip: TripMatchTrip): TripMatchResult {
  const subject = email.subject ?? "";
  const from = email.from ?? "";
  const snippet = email.snippet ?? "";
  const body = email.body ?? "";
  const subjectText = normalizeText(subject);
  const combined = normalizeText(`${subject} ${from} ${snippet} ${body}`);
  const receivedAt = email.received_at ? new Date(email.received_at) : null;
  const fallbackYear = receivedAt && !Number.isNaN(receivedAt.getTime())
    ? receivedAt.getUTCFullYear()
    : parseDate(trip.start_date)?.getUTCFullYear();

  const reasons: string[] = [];
  let score = 0;
  let strongTripSignal = false;

  const destination = normalizeText(trip.destination);
  if (destination && combined.includes(destination)) {
    score += subjectText.includes(destination) ? 0.44 : 0.34;
    strongTripSignal = true;
    reasons.push(`mentions destination "${trip.destination}"`);
  }

  const destinationTokens = tokenizeLocation(trip.destination);
  const matchedDestinationTokens = destinationTokens.filter((token) => combined.includes(token));
  if (destinationTokens.length > 0 && matchedDestinationTokens.length > 0) {
    const ratio = matchedDestinationTokens.length / destinationTokens.length;
    score += Math.min(0.2, ratio * 0.2);
    if (ratio >= 0.5) strongTripSignal = true;
    reasons.push(`matches destination terms: ${matchedDestinationTokens.join(", ")}`);
  }

  const nameTokens = tokenizeLocation(trip.name);
  const matchedNameTokens = nameTokens.filter((token) => combined.includes(token));
  if (nameTokens.length > 0 && matchedNameTokens.length > 0) {
    const ratio = matchedNameTokens.length / nameTokens.length;
    score += Math.min(0.08, ratio * 0.08);
    if (ratio >= 0.6) {
      strongTripSignal = true;
      reasons.push(`matches trip name terms: ${matchedNameTokens.join(", ")}`);
    }
  }

  const tripStart = parseDate(trip.start_date);
  const tripEnd = parseDate(trip.end_date);
  const extractedDates = extractDates(combined, fallbackYear);
  const matchedDates: string[] = [];

  if (tripStart && tripEnd && extractedDates.length > 0) {
    for (const dateValue of extractedDates) {
      const date = parseDate(dateValue);
      if (!date) continue;

      if (date >= addDays(tripStart, -2) && date <= addDays(tripEnd, 2)) {
        matchedDates.push(dateValue);
      }
    }

    if (matchedDates.length > 0) {
      score += Math.min(0.36, 0.2 + matchedDates.length * 0.08);
      strongTripSignal = true;
      reasons.push(`date overlaps trip window: ${matchedDates.join(", ")}`);
    } else {
      const closestDistance = Math.min(
        ...extractedDates
          .map(parseDate)
          .filter((date): date is Date => Boolean(date))
          .map((date) => Math.min(Math.abs(daysBetween(date, tripStart)), Math.abs(daysBetween(date, tripEnd))))
      );

      if (Number.isFinite(closestDistance) && closestDistance <= 21) {
        score += 0.06;
        reasons.push("date is close to trip window");
      }
    }
  }

  const travelTerms = TRAVEL_TERMS.filter((term) => combined.includes(term));
  if (travelTerms.length > 0) {
    score += Math.min(0.16, travelTerms.length * 0.035);
    reasons.push(`looks like travel email: ${travelTerms.slice(0, 4).join(", ")}`);
  }

  const normalizedFrom = normalizeText(from);
  const senderSignals = TRAVEL_SENDERS.filter((sender) => normalizedFrom.includes(sender));
  if (senderSignals.length > 0) {
    score += strongTripSignal ? 0.1 : 0.04;
    reasons.push(`travel sender: ${senderSignals[0]}`);
  }

  const promoSignals = PROMOTIONAL_TERMS.filter((term) => combined.includes(term));
  if (promoSignals.length > 0) {
    score -= Math.min(0.28, promoSignals.length * 0.06);
    reasons.push(`possible promo/newsletter: ${promoSignals.slice(0, 3).join(", ")}`);
  }

  const nonTravelSignals = NON_TRAVEL_CONFIRMATION_TERMS.filter((term) => combined.includes(term));
  if (nonTravelSignals.length > 0) {
    score -= Math.min(0.35, nonTravelSignals.length * 0.1);
    reasons.push(`likely unrelated: ${nonTravelSignals.slice(0, 3).join(", ")}`);
  }

  if (!strongTripSignal && matchedDates.length === 0) {
    score *= 0.45;
  }

  const finalScore = clampScore(score);
  return {
    trip_id: trip.id,
    trip_name: trip.name,
    destination: trip.destination,
    score: finalScore,
    confidence: getConfidence(finalScore),
    reasons,
    matched_dates: matchedDates,
  };
}

export function rankTripsForEmail(
  email: TripMatchEmail,
  trips: TripMatchTrip[],
  options: { minScore?: number; limit?: number } = {}
) {
  const minScore = options.minScore ?? 0.2;
  const limit = options.limit ?? 3;

  return trips
    .map((trip) => scoreEmailForTrip(email, trip))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
