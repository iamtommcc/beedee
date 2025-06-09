"use client"

import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEventsForMonth } from "@/lib/db-queries"
import { deleteEvent } from "@/lib/form-actions"
import { createSingleEventICS } from "@/lib/ical-utils"
import type { EventRecord } from "@/lib/types"
import { format } from "date-fns"
import { Building2, CalendarDays, CircleXIcon, Clock, Download, ExternalLink, MapPin } from "lucide-react"
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
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)

  useEffect(() => {
    async function fetchEvents() {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1 // 1-indexed for API
      const fetchedEvents = await getEventsForMonth(year, month, locationFilter)
      setEvents(fetchedEvents)
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

  const handleDownloadEvent = (event: EventRecord) => {
    const icsContent = createSingleEventICS(event)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
      <Card className="sticky top-20 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-none">
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
        <div className="md:col-span-1 sticky top-48 self-start">
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
                        <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>
                      )}
                    </CalendarDayButton>
                  )
                },
              }}
            />
        </div>

        <div className="w-full md:col-span-3 p-6 pt-0">
          <div className="mb-6">
            <h2 className="text-[1.8rem] font-bold tracking-tight">{selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Selected Date"}</h2>
            <p className="text-muted-foreground mt-1">
              {selectedDateEvents.length > 0
                ? `Found ${selectedDateEvents.length} event(s).`
                : "No events for this date, or no date selected."}
            </p>
          </div>
          {selectedDateEvents.length > 0 ? (
            <ul className="space-y-6">
              {selectedDateEvents.map((event) => (
                <li key={event.id} className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
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
                    <div className="flex items-center gap-3">
                      {event.event_url && (
                        <Button
                          asChild
                          className="h-7 px-3 bg-black hover:bg-gray-800 text-white"
                        >
                          <a
                            href={event.event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm font-medium"
                          >
                            View Event <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDownloadEvent(event)}
                        variant="outline"
                        className="h-7 px-3"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Event
                      </Button>
                      <a
                        href={event.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline inline-flex items-center"
                      >
                        View Source <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={deletingEventId === event.id}
                      className="h-7 px-2"
                    >
                      {deletingEventId === event.id ? (
                        "Deleting..."
                      ) : (
                        <>
                          <CircleXIcon className="h-3 w-3 mr-1" />
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
        </div>
      </div>
    </div>
  )
}
