import { EventCalendarDisplay } from "@/components/event-calendar-display";
import { getEventsForMonth, getUniqueCategories, getUniqueLocationCities } from "@/lib/db-queries";

interface HomePageProps {
  searchParams: Promise<{ location?: string; categories?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Load events for the current month initially
  const today = new Date()
  const { location: locationFilter, categories: categoriesParam } = await searchParams
  const categoryFilters = categoriesParam ? categoriesParam.split(',') : []
  
  // Fetch data in parallel
  const [initialEvents, locationCities, categories] = await Promise.all([
    getEventsForMonth(today.getFullYear(), today.getMonth() + 1, locationFilter, categoryFilters.length > 0 ? categoryFilters : undefined),
    getUniqueLocationCities(),
    getUniqueCategories()
  ])

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-semibold">Beedee by Jolie</h1>
      </header>
      <EventCalendarDisplay initialEvents={initialEvents} locationCities={locationCities} categories={categories} />
    </div>
  )
}
