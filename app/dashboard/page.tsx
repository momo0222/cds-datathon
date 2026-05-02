import { Navbar } from "@/components/layout/Navbar";
import { TripCard } from "@/components/trip/TripCard";
import { NewTripModal } from "@/components/trip/NewTripModal";
import { TripBuilderPanel } from "@/components/trip/TripBuilderPanel";
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
        <main className="max-w-4xl mx-auto px-6">
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
      <main className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <header className="pt-12 pb-8 animate-fade-in">
          <p className="font-mono text-xs text-sand-400 uppercase tracking-[0.15em] mb-2">
            ✦ Your Trips
          </p>
          <div className="flex justify-between items-start">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-sand-900 leading-tight">
              Where to<br />next?
            </h1>
            <NewTripModal defaultCurrency="USD" />
          </div>
        </header>

        {/* AI Trip Builder */}
        <TripBuilderPanel />

        {/* Trip cards */}
        <div className="flex flex-col gap-4 pb-16 mt-4">
          {allTrips.length === 0 ? (
            <div className="card p-6 animate-slide-up">
              <p className="text-sand-400 text-sm">
                No trips yet. Create your first trip to get started!
              </p>
            </div>
          ) : (
            allTrips.map((trip) => <TripCard key={trip.id} trip={trip as any} />)
          )}
        </div>
      </main>
    </>
  );
}
