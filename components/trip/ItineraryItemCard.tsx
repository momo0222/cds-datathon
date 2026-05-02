import { ItineraryItem, ITEM_TYPE_CONFIG, STATUS_CONFIG } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";

interface Props {
  item: ItineraryItem;
  onClick?: () => void;
}

export function ItineraryItemCard({ item, onClick }: Props) {
  const typeCfg = ITEM_TYPE_CONFIG[item.type];
  const statusCfg = STATUS_CONFIG[item.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full gap-3.5 rounded-sm border p-4 text-left transition-all duration-200",
        typeCfg.bgClass,
        "border-sand-100 hover:translate-x-1 hover:shadow-[0_1px_2px_rgba(24,40,28,0.04),0_14px_32px_rgba(29,158,117,0.10)]"
      )}
    >
      {/* Icon */}
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm bg-white text-xl shadow-[0_1px_2px_rgba(24,40,28,0.05)]">
        {typeCfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.time && (
            <span className={cn("font-mono text-xs font-medium", typeCfg.accentClass)}>
              {formatTime(item.time)}
            </span>
          )}
          <span className={cn("chip text-[10px] px-2 py-0.5", statusCfg.bgClass, statusCfg.textClass)}>
            {statusCfg.label}
          </span>
        </div>

        <p className="font-body text-[15px] font-semibold text-sand-900 truncate">
          {item.title}
        </p>

        {item.detail && (
          <p className="text-xs text-sand-400 mt-0.5 line-clamp-1">
            {item.detail}
          </p>
        )}

        {item.booking_ref && (
          <p className="font-mono text-[11px] text-sand-300 mt-1">
            Ref: {item.booking_ref}
          </p>
        )}
      </div>
    </button>
  );
}
