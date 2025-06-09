"use client"

import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEventsForMonth } from "@/lib/db-queries"
import { deleteEvent } from "@/lib/form-actions"
import type { EventRecord } from "@/lib/types"
import { format } from "date-fns"
import { Building2, CalendarDays, Clock, ExternalLink, MapPin, Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ICalSubscriptionModal } from "./ical-subscription-modal"

export function EventCalendarDisplay({ 
  initialEvents = [], 
  locationCities = [] 
}: { 
  initialEvents?: EventRecord[]
  locationCities?: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locationFilter = searchParams.get('location') || undefined
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [events, setEvents] = useState<EventRecord[]>(initialEvents)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1 // 1-indexed for API
      const fetchedEvents = await getEventsForMonth(year, month, locationFilter)
      setEvents(fetchedEvents)
      setIsLoading(false)
    }
    fetchEvents()
  }, [currentMonth, locationFilter])

  const handleDeleteEvent = async (eventId: number) => {
    setDeletingEventId(eventId)
    try {
      const result = await deleteEvent(eventId)
      if (result.success) {
        // Remove the event from local state
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error("Failed to delete event:", error)
    } finally {
      setDeletingEventId(null)
    }
  }

  const handleLocationFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('location')
    } else {
      params.set('location', value)
    }
    router.push(`?${params.toString()}`)
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRecord[]>()
    events.forEach((event) => {
      const dateStr = format(new Date(event.event_date), "yyyy-MM-dd")
      if (!map.has(dateStr)) {
        map.set(dateStr, [])
      }
      map.get(dateStr)!.push(event)
    })
    return map
  }, [events])

  const selectedDateEvents = selectedDate ? eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) || [] : []

  const eventDays = useMemo(() => {
    return Array.from(eventsByDate.keys()).map((dateStr) => new Date(dateStr + "T00:00:00"))
  }, [eventsByDate])

  return (
    <div className="space-y-6">
      {/* Combined Filter and Subscribe Card */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="location-filter" className="text-sm font-medium">
                Location:
              </label>
              <Select value={locationFilter || 'all'} onValueChange={handleLocationFilterChange}>
                <SelectTrigger id="location-filter" className="w-[200px]">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locationCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Subscribe to Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Modal */}
      <Modal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        title="Subscribe to Calendar"
        className="max-w-lg"
      >
        <ICalSubscriptionModal locationFilter={locationFilter} />
      </Modal>

      <div className="flex gap-6">
        {/* Calendar without card wrapper */}
        <div className="md:col-span-1">
          <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
              modifiers={{ hasEvent: eventDays }}
              components={{
                DayButton: (props) => {
                  const dayHasEvent = eventDays.some(
                    (eventDate) => format(eventDate, "yyyy-MM-dd") === format(props.day.date, "yyyy-MM-dd"),
                  )
                  return (
                    <CalendarDayButton {...props}>
                      {props.day.date.getDate()}
                      {dayHasEvent && (
                        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>
                      )}
                    </CalendarDayButton>
                  )
                },
              }}
            />
        </div>

        <Card className="w-full md:col-span-3">
          <CardHeader>
            <CardTitle className="text-2xl">{selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Selected Date"}</CardTitle>
            <CardDescription>
              {selectedDateEvents.length > 0
                ? `Found ${selectedDateEvents.length} event(s).`
                : "No events for this date, or no date selected."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {selectedDateEvents.length > 0 ? (
                <ul className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <li key={event.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      {event.organisation_title && (
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <Building2 className="h-4 w-4 mr-2" />
                          {event.organisation_title}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-2" />
                        {format(new Date(event.event_date), "EEE, MMM d, yyyy")}
                        {event.event_time && ` at ${event.event_time}`}
                      </p>
                      {(event.location || event.location_city) && (
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-2" />
                          {event.location_city && (
                            <span className="font-medium mr-1">{event.location_city}</span>
                          )}
                          {event.location && event.location_city && " - "}
                          {event.location}
                        </p>
                      )}
                      {event.description && <p className="mt-2 text-sm">{event.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center"
                        >
                          View Source <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deletingEventId === event.id}
                          className="h-7 px-2"
                        >
                          {deletingEventId === event.id ? (
                            "Deleting..."
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {selectedDate ? "No events scheduled for this day." : "Please select a day on the calendar."}
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
