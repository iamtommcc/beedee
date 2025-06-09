"use server"

import { getDbClient } from "./db"
import type { EventRecord, WebpageConfig } from "./types"

export async function getWebpages(): Promise<WebpageConfig[]> {
  const sql = getDbClient()
  try {
    const result = await sql`
      SELECT 
        w.id, 
        w.url, 
        w.organisation_title, 
        w.created_at, 
        w.last_scraped_at, 
        w.status, 
        w.error_message,
        COALESCE(COUNT(e.id), 0) as event_count
      FROM webpages_to_scrape w
      LEFT JOIN events e ON w.id = e.webpage_config_id AND e.deleted_at IS NULL
      GROUP BY w.id, w.url, w.organisation_title, w.created_at, w.last_scraped_at, w.status, w.error_message
      ORDER BY w.created_at DESC
    ` as WebpageConfig[]
    return result
  } catch (error: unknown) {
    console.error("Failed to fetch webpages:", error)
    // It's important to check if the error is "relation does not exist"
    // and guide the user to run the schema script.
    if (error instanceof Error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
      console.error(
        "DATABASE SCHEMA MISSING: Please run the SQL script to create tables (e.g., scripts/001-create-tables.sql).",
      )
    }
    return []
  }
}

export async function getEventsForMonth(year: number, month: number, locationFilter?: string): Promise<EventRecord[]> {
  const sql = getDbClient()
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Last day of the month

  try {
    const result = (await sql`
      SELECT e.id, e.title, e.event_date, e.event_time, e.location, e.location_city, e.description, e.source_url, e.event_url, e.scraped_at, e.deleted_at, e.webpage_config_id, w.organisation_title
      FROM events e
      LEFT JOIN webpages_to_scrape w ON e.webpage_config_id = w.id
      WHERE e.event_date >= ${startDate.toISOString().split("T")[0]} AND e.event_date <= ${endDate.toISOString().split("T")[0]}
        AND e.deleted_at IS NULL
        ${locationFilter ? sql`AND e.location_city = ${locationFilter}` : sql``}
      ORDER BY e.event_date, e.event_time
    `) as EventRecord[]

    return result
  } catch (error: unknown) {
    console.error("Failed to fetch events for month:", error)
    if (error instanceof Error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
      console.error(
        "DATABASE SCHEMA MISSING: The 'events' table does not exist. Please run the SQL script (scripts/001-create-tables.sql).",
      )
    }
    return []
  }
}

export async function getAllEvents(locationFilter?: string): Promise<EventRecord[]> {
  const sql = getDbClient()
  try {
    const result = (await sql`
      SELECT e.id, e.title, e.event_date, e.event_time, e.location, e.location_city, e.description, e.source_url, e.event_url, e.scraped_at, e.deleted_at, e.webpage_config_id, w.organisation_title
      FROM events e
      LEFT JOIN webpages_to_scrape w ON e.webpage_config_id = w.id
      WHERE e.deleted_at IS NULL
        ${locationFilter ? sql`AND e.location_city = ${locationFilter}` : sql``}
      ORDER BY e.event_date DESC, e.event_time
    `) as EventRecord[]

    return result
  } catch (error: unknown) {
    console.error("Failed to fetch all events:", error)
    if (error instanceof Error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
      console.error(
        "DATABASE SCHEMA MISSING: The 'events' table does not exist. Please run the SQL script (scripts/001-create-tables.sql).",
      )
    }
    return []
  }
}

export async function getUniqueLocationCities(): Promise<string[]> {
  const sql = getDbClient()
  try {
    const result = await sql`
      SELECT DISTINCT location_city
      FROM events
      WHERE location_city IS NOT NULL 
        AND location_city != ''
        AND deleted_at IS NULL
      ORDER BY location_city ASC
    ` as { location_city: string }[]

    return result.map(row => row.location_city)
  } catch (error: unknown) {
    console.error("Failed to fetch unique location cities:", error)
    if (error instanceof Error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
      console.error(
        "DATABASE SCHEMA MISSING: The 'events' table does not exist. Please run the SQL script (scripts/001-create-tables.sql).",
      )
    }
    return []
  }
}
