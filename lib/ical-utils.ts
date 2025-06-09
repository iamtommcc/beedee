import ical from 'ical-generator'
import type { EventRecord } from './types'

// Mapping of cities to their respective timezones
const CITY_TIMEZONE_MAP: Record<string, string> = {
  'Brisbane': 'Australia/Brisbane',
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Melbourne',
  'Adelaide': 'Australia/Adelaide',
  'Perth': 'Australia/Perth',
  'Darwin': 'Australia/Darwin',
  'Hobart': 'Australia/Hobart',
  'Canberra': 'Australia/Canberra',
  'Gold Coast': 'Australia/Brisbane',
  'Sunshine Coast': 'Australia/Brisbane',
  'Newcastle': 'Australia/Sydney',
  'Wollongong': 'Australia/Sydney',
  'Geelong': 'Australia/Melbourne',
  'Townsville': 'Australia/Brisbane',
  'Cairns': 'Australia/Brisbane',
  'Toowoomba': 'Australia/Brisbane',
  'Ballarat': 'Australia/Melbourne',
  'Bendigo': 'Australia/Melbourne',
  'Albury': 'Australia/Sydney',
  'Launceston': 'Australia/Hobart',
  'Online': 'Australia/Brisbane', // Default for online events
}

function getTimezoneForCity(city?: string): string {
  if (!city) return 'Australia/Brisbane' // Default fallback
  return CITY_TIMEZONE_MAP[city] || 'Australia/Brisbane'
}

export function createCalendarFromEvents(events: EventRecord[], calendarName = 'Event Calendar'): string {
  // Create a new calendar
  const calendar = ical({
    name: calendarName,
    description: 'Scraped events from various websites',
    prodId: {
      company: 'Beedee',
      product: 'Event Scraper',
      language: 'EN'
    }
  })

  // Convert database events to iCal events
  for (const event of events) {
    addEventToCalendar(calendar, event)
  }

  return calendar.toString()
}

export function createSingleEventICS(event: EventRecord): string {
  return createCalendarFromEvents([event], event.title)
}

function addEventToCalendar(calendar: any, event: EventRecord) {
  // Get the appropriate timezone for this event's city
  const eventTimezone = getTimezoneForCity(event.location_city)
  
  // Parse the event date and time
  const eventDate = new Date(event.event_date)
  let startDate: Date
  let endDate: Date

  if (event.event_time) {
    // Parse time in HH:MM format
    const [hours, minutes] = event.event_time.split(':').map(Number)
    startDate = new Date(eventDate)
    startDate.setHours(hours, minutes, 0, 0)
    
    // Default end time to 2 hours after start for better calendar blocking
    endDate = new Date(startDate)
    endDate.setHours(hours + 2, minutes, 0, 0)
  } else {
    // All-day event - use date-only format
    startDate = new Date(eventDate)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(eventDate)
    endDate.setDate(endDate.getDate() + 1) // Next day for all-day events
    endDate.setHours(0, 0, 0, 0)
  }

  // Add event to calendar with appropriate timezone
  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    url: event.event_url,
    allDay: !event.event_time, // Mark as all-day if no time specified
    timezone: eventTimezone, // Use the event's city-specific timezone
    // Add organization as part of description if available
    ...(event.organisation_title && {
      organizer: {
        name: event.organisation_title,
        email: undefined // We don't have email info
      }
    })
  })
} 