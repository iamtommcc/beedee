import { getAllEvents } from '@/lib/db-queries'
import { createCalendarFromEvents } from '@/lib/ical-utils'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensures the route is not statically cached

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationCity = searchParams.get('location_city')

    // Fetch events from database, filtered by city if specified
    const events = await getAllEvents(locationCity || undefined)

    // Generate iCal string using shared utility
    const icalString = createCalendarFromEvents(events)

    // Return with proper headers for iCal
    return new NextResponse(icalString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="events${locationCity ? `-${locationCity}` : ''}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error generating iCal feed:', error)
    return NextResponse.json(
      { error: 'Failed to generate iCal feed' },
      { status: 500 }
    )
  }
} 