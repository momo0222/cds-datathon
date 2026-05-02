import { Navbar } from "@/components/layout/Navbar";
import { TripCard } from "@/components/trip/TripCard";
import { NewTripModal } from "@/components/trip/NewTripModal";
import { TripBuilderPanel } from "@/components/trip/TripBuilderPanel";
import { DashboardTurtlePanel } from "@/components/trip/DashboardTurtlePanel";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-6">
          <div className="pt-12">
            <div className="card p-6 text-sand-400 text-sm">Please sign in.</div>
          </div>
        </main>
      </>
    );
  }

  const admin = createAdminSupabase();

  // Fetch owned trips (use !user_id hint to disambiguate FK from trip_members to profiles)
  const { data: ownedTrips } = await admin
    .from("trips")
    .select("*, members:trip_members(*, profile:profiles!user_id(full_name))")
    .eq("owner_id", user.id)
    .order("start_date", { ascending: false });

  // Fetch trips where user is a member (but not owner)
  const { data: memberRows } = await admin
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", user.id);
  const memberTripIds = (memberRows ?? [])
    .map((r) => r.trip_id)
    .filter((id) => !(ownedTrips ?? []).some((t) => t.id === id));

  let memberTrips: any[] = [];
  if (memberTripIds.length > 0) {
    const { data } = await admin
      .from("trips")
      .select("*, members:trip_members(*, profile:profiles!user_id(full_name))")
      .in("id", memberTripIds)
      .order("start_date", { ascending: false });
    memberTrips = data ?? [];
  }

  const allTrips = [...(ownedTrips ?? []), ...memberTrips];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6">
        <header className="relative overflow-hidden pb-10 pt-12 animate-fade-in">
          <div className="absolute left-1/2 top-0 -z-10 h-48 w-screen -translate-x-1/2 bg-[linear-gradient(135deg,rgba(29,158,117,0.13),rgba(250,199,117,0.20)_45%,rgba(246,249,247,0)_76%)] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-ocean-dark">
                TRVL workspace
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[0.95] text-sand-900 md:text-7xl">
                Plan the trip.
                <br />
                Keep the receipts.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-sand-600">
                Build new itineraries, import confirmations, and keep every decision reviewable before it lands on the schedule.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 border-l-[3px] border-coral px-5 py-3 lg:items-end lg:border-l-0 lg:border-r-[3px] lg:text-right">
              <p className="max-w-xs text-sm leading-6 text-sand-500">
                Start blank when you know the plan, or let TRVL sketch the first route.
              </p>
              <NewTripModal defaultCurrency="USD" />
            </div>
          </div>
        </header>

        <section className="grid gap-10 pb-20 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            <TripBuilderPanel />
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-sand-200 pb-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sand-400">
                  Active plans
                </p>
                <h2 className="font-display text-2xl font-semibold text-sand-900">
                  Your trips
                </h2>
              </div>
              <span className="font-mono text-xs text-sand-400">
                {allTrips.length} total
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {allTrips.length === 0 ? (
                <div className="border-l-[3px] border-ocean bg-white px-5 py-6 text-sm text-sand-500 shadow-[0_1px_2px_rgba(24,40,28,0.04),0_18px_45px_rgba(29,158,117,0.08)]">
                  No trips yet. Create a blank trip or ask the builder for a first draft.
                </div>
              ) : (
                allTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip as any}
                    canDelete={trip.owner_id === user.id}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <DashboardTurtlePanel />
    </>
  );
}
