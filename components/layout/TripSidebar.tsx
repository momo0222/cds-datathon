import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  tripId: string;
  activeTab: string;
}

const TABS = [
  { key: "itinerary", label: "Itinerary", icon: "📋", path: "" },
  { key: "budget",    label: "Budget",    icon: "💰", path: "/budget" },
  { key: "share",     label: "Share",     icon: "👥", path: "/share" },
];

export function TripSidebar({ tripId, activeTab }: Props) {
  return (
    <aside className="hidden md:flex min-h-[calc(100vh-80px)] w-56 flex-col gap-2 border-r border-sand-100 bg-white/65 p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sand-400">
        Trip desk
      </p>
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`/trips/${tripId}${tab.path}`}
          className={cn(
            "flex items-center gap-3 rounded-sm border-l-[3px] px-3 py-2.5 text-sm font-medium transition-all duration-150",
            activeTab === tab.key
              ? "border-coral bg-sand-900 text-white shadow-[0_1px_2px_rgba(24,40,28,0.04),0_14px_32px_rgba(29,158,117,0.12)]"
              : "border-transparent text-sand-500 hover:border-sand-200 hover:bg-sand-50 hover:text-sand-800"
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
              "flex flex-col items-center gap-0.5 rounded-sm px-3 py-1.5 text-[10px] font-medium transition-colors",
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
