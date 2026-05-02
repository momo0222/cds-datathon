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
        "w-full flex gap-3.5 p-4 rounded-2xl border transition-all duration-200 text-left",
        typeCfg.bgClass,
        "border-transparent hover:translate-x-1 hover:shadow-md"
      )}
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm flex-shrink-0">
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
