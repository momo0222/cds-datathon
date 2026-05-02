import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";
import { ItineraryView } from "@/components/trip/ItineraryView";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole } from "@/lib/check-role";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

// TODO: Fetch trip data
// const supabase = createServerSupabase()
// const { data: trip } = await supabase.from('trips')
//   .select('*, days(*, itinerary_items(*)), trip_members(*, profile:profiles(*))')
//   .eq('id', params.id)
//   .single()

export default async function TripItineraryPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="card p-6 text-sand-400 text-sm">Please sign in.</div>
        </div>
      </>
    );
  }

  const admin = createAdminSupabase();
  const userRole = await getTripRole(params.id, user.id);

  const { data: trip, error } = await admin
    .from("trips")
    .select("*, days(*, items:itinerary_items(*))")
    .eq("id", params.id)
    .order("date", { referencedTable: "days", ascending: true })
    .single();

  if (error || !trip) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="card p-6 text-sand-400 text-sm">Trip not found.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="itinerary" />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-2">
            {trip.name}
          </h1>
          <p className="text-sand-400 text-sm mb-8">{trip.destination}</p>

          <ItineraryView trip={trip as any} canEdit={userRole === "owner" || userRole === "editor"} />
        </main>
      </div>
    </>
  );
}
