import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripTravelPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;

  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="travel" />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
              Travel
            </h1>
            <p className="text-sand-400 text-sm">
              Search and compare flights
            </p>
          </div>

          <FlightSearchForm />
        </main>
      </div>
    </>
  );
}
