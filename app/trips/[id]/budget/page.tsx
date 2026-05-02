import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";
import { BudgetPageClient } from "@/components/trip/BudgetPageClient";
import { createServerSupabase } from "@/lib/supabase-server";
import { getTripRole } from "@/lib/check-role";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripBudgetPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const userRole = user ? await getTripRole(params.id, user.id) : null;

  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="budget" />
        <main className="mx-auto max-w-5xl flex-1 px-6 py-8">
          <div className="relative mb-9 overflow-hidden border-b border-sand-200 pb-7">
            <div className="absolute right-0 top-0 -z-10 h-28 w-80 bg-[linear-gradient(135deg,rgba(29,158,117,0.12),rgba(250,199,117,0.18),rgba(246,249,247,0))] [mask-image:linear-gradient(to_left,black,transparent)]" />
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ocean-dark">
              Budget desk
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-sand-900 md:text-5xl">
              Budget
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-sand-500">
              Track booked costs, loose expenses, and the trade-offs before the trip gets expensive.
            </p>
          </div>

          <BudgetPageClient
            tripId={params.id}
            canEdit={userRole === "owner" || userRole === "editor"}
          />
        </main>
      </div>
    </>
  );
}
