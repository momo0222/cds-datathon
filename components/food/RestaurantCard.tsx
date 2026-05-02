interface Place {
  id: string;
  name: string;
  rating: number;
  price_level: number;
  cuisine: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  open_now: boolean;
}

interface Props {
  place: Place;
  onAddToDay?: (place: Place) => void;
}

export function RestaurantCard({ place, onAddToDay }: Props) {
  const priceLabel = "💲".repeat(place.price_level || 1);

  return (
    <div className="card p-4 flex gap-4">
      {/* Photo or placeholder */}
      <div className="w-20 h-20 rounded-xl bg-sand-100 flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden">
        {place.photo_url ? (
          <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
        ) : (
          "🍽️"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-body text-sm font-semibold text-sand-900 truncate">
              {place.name}
            </h4>
            <p className="text-xs text-sand-400 mt-0.5">{place.cuisine}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <span className="text-xs font-medium text-amber">★ {place.rating}</span>
            <span className="text-xs text-sand-300">{priceLabel}</span>
          </div>
        </div>

        <p className="text-xs text-sand-400 mt-1 truncate">{place.address}</p>

        <div className="flex items-center gap-3 mt-2.5">
          <span className={`chip text-[10px] ${place.open_now ? "bg-moss/10 text-moss" : "bg-coral/10 text-coral"}`}>
            {place.open_now ? "Open now" : "Closed"}
          </span>
          {onAddToDay && (
            <button
              onClick={() => onAddToDay(place)}
              className="text-xs font-semibold text-ocean hover:underline"
            >
              + Add to itinerary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
