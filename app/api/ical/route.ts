import { getAllEvents } from '@/lib/db-queries'
import { createCalendarFromEvents } from '@/lib/ical-utils'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensures the route is not statically cached

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationCity = searchParams.get('location_city')
    const categoriesParam = searchParams.get('categories')
    const categoryFilters = categoriesParam ? categoriesParam.split(',') : []

    // Fetch events from database, filtered by city and categories if specified
    const events = await getAllEvents(locationCity || undefined, categoryFilters.length > 0 ? categoryFilters : undefined)

    // Generate iCal string using shared utility
    const icalString = createCalendarFromEvents(events)

    // Build filename based on filters
    const filenameParts = []
    if (locationCity) filenameParts.push(locationCity)
    if (categoryFilters.length > 0) filenameParts.push(categoryFilters.join('-'))
    const filenameSuffix = filenameParts.length > 0 ? `-${filenameParts.join('-')}` : ''

    // Return with proper headers for iCal
    return new NextResponse(icalString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="events${filenameSuffix}.ics"`,
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