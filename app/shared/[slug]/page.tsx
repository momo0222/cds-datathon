import { Navbar } from "@/components/layout/Navbar";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { ITEM_TYPE_CONFIG, STATUS_CONFIG } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharedTripPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  const admin = createAdminSupabase();

  // Look up the share link by slug
  const { data: link } = await admin
    .from("shared_links")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!link) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-2">Link Not Found</h1>
          <p className="text-sand-400">This share link doesn&apos;t exist or has been disabled.</p>
        </main>
      </>
    );
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-2">Link Expired</h1>
          <p className="text-sand-400">This share link has expired.</p>
        </main>
      </>
    );
  }

  // Fetch the trip with days and items
  const { data: trip } = await admin
    .from("trips")
    .select("*, days(*, items:itinerary_items(*))")
    .eq("id", link.trip_id)
    .order("date", { referencedTable: "days", ascending: true })
    .single();

  if (!trip) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-2">Trip Not Found</h1>
          <p className="text-sand-400">The trip associated with this link no longer exists.</p>
        </main>
      </>
    );
  }

  const days = (trip.days ?? []) as any[];

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <p className="font-mono text-xs text-sand-400 uppercase tracking-[0.15em] mb-1">
            Shared Trip
          </p>
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
            {trip.cover_emoji} {trip.name}
          </h1>
          <p className="text-sand-400 text-sm">
            {trip.destination} &middot; {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
          </p>
        </div>

        {days.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sand-400 text-sm">No itinerary yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((day: any) => {
              const items = (day.items ?? []).slice().sort((a: any, b: any) => {
                if ((a.sort_order ?? 0) !== (b.sort_order ?? 0))
                  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
                return (a.time ?? "").localeCompare(b.time ?? "");
              });
              return (
                <div key={day.id} className="animate-slide-up">
                  <h2 className="font-display text-lg font-bold text-sand-900 mb-3">
                    {formatDate(day.date)}
                    {day.label && (
                      <span className="text-sand-400 font-normal ml-2">— {day.label}</span>
                    )}
                  </h2>
                  {items.length === 0 ? (
                    <div className="card p-4 text-sand-400 text-sm">No items for this day.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {items.map((item: any) => {
                        const tc = ITEM_TYPE_CONFIG[item.type as keyof typeof ITEM_TYPE_CONFIG];
                        const sc = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                        return (
                          <div
                            key={item.id}
                            className="card p-4 flex items-start gap-3"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${tc?.bgClass ?? "bg-sand-100"}`}
                            >
                              {tc?.icon ?? "📌"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {item.time && (
                                  <span className="font-mono text-xs text-sand-400">
                                    {item.time.slice(0, 5)}
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc?.bgClass ?? ""} ${sc?.textClass ?? ""}`}
                                >
                                  {sc?.label ?? item.status}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-sand-900 truncate">
                                {item.title}
                              </p>
                              {item.detail && (
                                <p className="text-xs text-sand-400 truncate">{item.detail}</p>
                              )}
                              {item.location_name && (
                                <p className="text-xs text-sand-400 mt-0.5">📍 {item.location_name}</p>
                              )}
                            </div>
                            {item.cost > 0 && (
                              <span className="text-xs font-mono text-sand-400 shrink-0">
                                {item.currency} {item.cost}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
