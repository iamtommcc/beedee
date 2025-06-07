import { EventCalendarDisplay } from "@/components/event-calendar-display"
import { getEventsForMonth } from "@/lib/db-queries"

export default async function HomePage() {
  // Load events for the current month initially
  const today = new Date()
  const initialEvents = await getEventsForMonth(today.getFullYear(), today.getMonth() + 1)

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Beedee</h1>
        <p className="text-xl text-muted-foreground">Your Business Development Event Aggregator</p>
      </header>
      <EventCalendarDisplay initialEvents={initialEvents} />
    </div>
  )
}
