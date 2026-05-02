import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  tripId: string;
  activeTab: string;
}

const TABS = [
  { key: "itinerary", label: "Itinerary", icon: "📋", path: "" },
  { key: "travel",    label: "Travel",    icon: "✈️", path: "/travel" },
  { key: "budget",    label: "Budget",    icon: "💰", path: "/budget" },
  { key: "food",      label: "Food",      icon: "🍽️", path: "/food" },
  { key: "share",     label: "Share",     icon: "👥", path: "/share" },
];

export function TripSidebar({ tripId, activeTab }: Props) {
  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-sand-100 min-h-[calc(100vh-64px)] bg-white/50 p-4 gap-1">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`/trips/${tripId}${tab.path}`}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            activeTab === tab.key
              ? "bg-sand-900 text-white shadow-sm"
              : "text-sand-500 hover:bg-sand-100 hover:text-sand-700"
          )}
        >
          <span className="text-base">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </aside>
  );
}

// Mobile bottom nav — use this in a layout or each page for small screens
export function MobileNav({ tripId, activeTab }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden glass border-t border-sand-100 z-50">
      <div className="flex justify-around py-2">
        {TABS.map(tab => (
          <Link
            key={tab.key}
            href={`/trips/${tripId}${tab.path}`}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors",
              activeTab === tab.key ? "text-ocean" : "text-sand-400"
            )}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
