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
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
              Budget
            </h1>
            <p className="text-sand-400 text-sm">
              Track spending and stay on target
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
