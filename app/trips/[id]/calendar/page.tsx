import { Navbar } from "@/components/layout/Navbar";
import { TripSidebar } from "@/components/layout/TripSidebar";

interface Props {
  params: Promise<{ id: string }>;
}

// TODO: Fetch days + items for calendar grid
// const { data: days } = await supabase.from('days')
//   .select('*, itinerary_items(*)')
//   .eq('trip_id', params.id)
//   .order('date')

export default async function TripCalendarPage({ params: paramsPromise }: Props) {
  const params = await paramsPromise;
  return (
    <>
      <Navbar />
      <div className="flex">
        <TripSidebar tripId={params.id} activeTab="calendar" />
        <main className="flex-1 max-w-5xl mx-auto px-6 py-8">
          <h1 className="font-display text-3xl font-bold text-sand-900 mb-1">
            Calendar
          </h1>
          <p className="text-sand-400 text-sm mb-8">
            See your entire trip at a glance
          </p>

          {/* 
            Person 2: Build calendar grid here
            
            Options:
            A) Custom grid with date-fns (lighter, more control)
               - Generate array of dates from trip.start_date to trip.end_date
               - Render as a grid/timeline
               - Each cell shows items for that day, color-coded by type
            
            B) @fullcalendar/react (heavier but feature-rich)
               - npm install @fullcalendar/react @fullcalendar/daygrid
               - Drag-and-drop rescheduling built in
            
            Recommended: Option A for the 3-hour sprint. Example:
            
            <div className="grid grid-cols-7 gap-2">
              {allDates.map(date => {
                const dayItems = items.filter(i => i.day.date === date);
                return (
                  <div key={date} className="card p-3 min-h-[120px]">
                    <p className="font-mono text-xs text-sand-400 mb-2">
                      {format(date, 'EEE d')}
                    </p>
                    {dayItems.map(item => (
                      <div key={item.id} className={`chip ${ITEM_TYPE_CONFIG[item.type].bgClass} mb-1`}>
                        {ITEM_TYPE_CONFIG[item.type].icon} {item.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          */}

          <div className="card p-12 text-center animate-fade-in">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sand-400 text-sm">
              Calendar view — see your full trip timeline here.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
