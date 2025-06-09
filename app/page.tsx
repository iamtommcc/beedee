import { EventCalendarDisplay } from "@/components/event-calendar-display"
import { getEventsForMonth, getUniqueLocationCities } from "@/lib/db-queries"

interface HomePageProps {
  searchParams: Promise<{ location?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Load events for the current month initially
  const today = new Date()
  const { location: locationFilter } = await searchParams
  
  // Fetch data in parallel
  const [initialEvents, locationCities] = await Promise.all([
    getEventsForMonth(today.getFullYear(), today.getMonth() + 1, locationFilter),
    getUniqueLocationCities()
  ])

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Beedee</h1>
        <p className="text-xl text-muted-foreground">Your Business Development Event Aggregator</p>
      </header>
      <EventCalendarDisplay initialEvents={initialEvents} locationCities={locationCities} />
    </div>
  )
}
