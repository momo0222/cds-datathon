import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";
import { ItineraryView } from "@/components/trip/ItineraryView";
import { DeleteTripButton } from "@/components/trip/DeleteTripButton";
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
        <main className="mx-auto max-w-5xl flex-1 px-6 py-8">
          <div className="relative mb-9 overflow-hidden border-b border-sand-200 pb-7">
            <div className="absolute right-0 top-0 -z-10 h-28 w-80 bg-[linear-gradient(135deg,rgba(29,158,117,0.12),rgba(250,199,117,0.18),rgba(246,249,247,0))] [mask-image:linear-gradient(to_left,black,transparent)]" />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ocean-dark">
                Itinerary
              </p>
              <h1 className="font-display text-4xl font-semibold leading-tight text-sand-900 md:text-5xl">
                {trip.name}
              </h1>
              <p className="mt-2 text-sm text-sand-500">{trip.destination}</p>
            </div>
            {userRole === "owner" && (
              <DeleteTripButton tripId={params.id} tripName={trip.name} />
            )}
            </div>
          </div>

          <ItineraryView trip={trip as any} canEdit={userRole === "owner" || userRole === "editor"} />
        </main>
      </div>
    </>
  );
}
