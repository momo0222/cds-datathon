// ============================================
// TRVL — Shared Types
// ============================================

export type ItemType = "flight" | "hotel" | "transport" | "activity" | "restaurant";
export type ItemStatus = "confirmed" | "pending" | "suggestion" | "cancelled";
export type MemberRole = "owner" | "editor" | "viewer";
export type ExpenseCategory = "flight" | "hotel" | "transport" | "food" | "activity" | "shopping" | "other";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  name: string;
  destination: string;
  cover_emoji: string;
  color: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  members?: TripMember[];
  days?: Day[];
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  joined_at: string;
  // Joined
  profile?: Profile;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  label: string | null;
  sort_order: number;
  created_at: string;
  // Joined
  items?: ItineraryItem[];
}

export interface ItineraryItem {
  id: string;
  day_id: string;
  trip_id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  detail: string | null;
  time: string | null;
  end_time: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  booking_ref: string | null;
  booking_url: string | null;
  cost: number;
  currency: string;
  notes: string | null;
  added_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  item_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  paid_by: string | null;
  split_between: string[];
  date: string | null;
  created_at: string;
}

export interface SharedLink {
  id: string;
  trip_id: string;
  slug: string;
  allow_suggestions: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================
// UI Config types
// ============================================

export interface ItemTypeConfig {
  icon: string;
  label: string;
  bgClass: string;
  accentClass: string;
}

export const ITEM_TYPE_CONFIG: Record<ItemType, ItemTypeConfig> = {
  flight:     { icon: "✈️",  label: "Flight",    bgClass: "bg-ocean/5",  accentClass: "text-ocean" },
  hotel:      { icon: "🏨",  label: "Hotel",     bgClass: "bg-purple-500/5", accentClass: "text-purple-600" },
  transport:  { icon: "🚄",  label: "Transport", bgClass: "bg-moss/5",   accentClass: "text-moss" },
  activity:   { icon: "📍",  label: "Activity",  bgClass: "bg-amber/5",  accentClass: "text-amber" },
  restaurant: { icon: "🍽️",  label: "Dining",    bgClass: "bg-coral/5",  accentClass: "text-coral" },
};

export const STATUS_CONFIG: Record<ItemStatus, { bgClass: string; textClass: string; label: string }> = {
  confirmed: { bgClass: "bg-emerald-50",  textClass: "text-emerald-700", label: "Confirmed" },
  pending:   { bgClass: "bg-red-50",      textClass: "text-red-700",     label: "Pending" },
  suggestion:{ bgClass: "bg-amber-50",    textClass: "text-amber-700",   label: "Suggestion" },
  cancelled: { bgClass: "bg-gray-100",    textClass: "text-gray-500",    label: "Cancelled" },
};

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
}
