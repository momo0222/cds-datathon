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
        <main className="mx-auto max-w-5xl flex-1 px-6 py-8">
          <div className="relative mb-9 overflow-hidden border-b border-sand-200 pb-7">
            <div className="absolute right-0 top-0 -z-10 h-28 w-80 bg-[linear-gradient(135deg,rgba(29,158,117,0.12),rgba(250,199,117,0.18),rgba(246,249,247,0))] [mask-image:linear-gradient(to_left,black,transparent)]" />
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ocean-dark">
              Access control
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-sand-900 md:text-5xl">
              Sharing & Collaboration
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-sand-500">
              Invite the right people, manage roles, and share a reviewable trip link.
            </p>
          </div>

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
