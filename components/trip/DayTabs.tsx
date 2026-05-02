"use client";

import { Day } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  days: Day[];
  activeIndex: number;
  onSelect: (index: number) => void;
  accentColor?: string;
}

export function DayTabs({ days, activeIndex, onSelect, accentColor = "#2D5A8E" }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-sand-100 pb-3 scrollbar-none">
      {days.map((day, i) => (
        <button
          key={day.id}
          onClick={() => onSelect(i)}
          className={cn(
            "flex-shrink-0 rounded-sm border-l-[3px] px-5 py-2.5 text-sm font-semibold transition-all duration-200",
            activeIndex === i
              ? "border-coral text-white shadow-[0_1px_2px_rgba(24,40,28,0.04),0_14px_32px_rgba(29,158,117,0.13)]"
              : "border-sand-200 bg-white text-sand-500 hover:border-sand-300"
          )}
          style={activeIndex === i ? { background: accentColor } : undefined}
        >
          <div className="text-[11px] opacity-80 mb-0.5">
            {formatDate(day.date, "EEE, MMM d")}
          </div>
          {day.label || `Day ${i + 1}`}
        </button>
      ))}
    </div>
  );
}
