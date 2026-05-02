import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";
import { SharePageClient } from "@/components/trip/SharePageClient";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripSharePage({ params: paramsPromise }: Props) {
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
  const { data: trip } = await admin
    .from("trips")
    .select("id, owner_id, name")
    .eq("id", params.id)
    .single();

  const isOwner = trip?.owner_id === user.id;

  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="share" />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
            Sharing & Collaboration
          </h1>
          <p className="text-sand-400 text-sm mb-8">
            Invite friends and family to view or edit this trip
          </p>

          <SharePageClient
            tripId={params.id}
            currentUserId={user.id}
            isOwner={isOwner}
          />
        </main>
      </div>
    </>
  );
}
