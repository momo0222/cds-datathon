import { format, parseISO, differenceInDays } from "date-fns";

// ============================================
// Date helpers
// ============================================

export function formatDate(date: string, fmt: string = "MMM d") {
  return format(parseISO(date), fmt);
}

export function formatDateRange(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

export function tripDuration(start: string, end: string) {
  return differenceInDays(parseISO(end), parseISO(start)) + 1;
}

export function formatTime(time: string | null) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

// ============================================
// Currency helpers
// ============================================

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function budgetProgress(spent: number, total: number) {
  if (total <= 0) return 0;
  return Math.min((spent / total) * 100, 100);
}

// ============================================
// String helpers
// ============================================

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

// ============================================
// Misc
// ============================================

export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
