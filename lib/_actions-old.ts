"use server"

import { revalidatePath } from "next/cache";
import { getDbClient } from "./db";
import type { EventData } from "./scraper"; // Assuming EventData is exported
import { scrapeUrlAndStoreEvents } from "./scraper";

export interface WebpageConfig {
  id: number
  url: string
  created_at: string
  last_scraped_at?: string | null
  status?: string | null
  error_message?: string | null
}

export interface EventRecord extends EventData {
  id: number
  scraped_at: string
}

export async function addWebpage(formData: FormData) {
  const sql = getDbClient()
  const url = formData.get("url") as string

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return { error: "Invalid URL format." }
  }

  try {
    const existing = await sql`SELECT id FROM webpages_to_scrape WHERE url = ${url}`
    if (existing.length > 0) {
      return { error: "URL already exists." }
    }

    await sql`
      INSERT INTO webpages_to_scrape (url, status) 
      VALUES (${url}, 'pending')
    `
    revalidatePath("/configure")
    return { success: "URL added successfully. It will be scraped soon." }
  } catch (error: unknown) {
    console.error("Failed to add webpage:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Database error: ${errorMessage}` }
  }
}

export async function getWebpages(): Promise<WebpageConfig[]> {
  const sql = getDbClient()
  try {
    const result = await sql`
      SELECT id, url, created_at, last_scraped_at, status, error_message 
      FROM webpages_to_scrape 
      ORDER BY created_at DESC
    ` as WebpageConfig[]
    return result
  } catch (error: unknown) {
    console.error("Failed to fetch webpages:", error)
    return []
  }
}

export async function deleteWebpage(id: number) {
  const sql = getDbClient()
  try {
    await sql`DELETE FROM webpages_to_scrape WHERE id = ${id}`
    revalidatePath("/configure")
    return { success: "URL deleted successfully." }
  } catch (error: unknown) {
    console.error("Failed to delete webpage:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Database error: ${errorMessage}` }
  }
}

export async function triggerScrape(webpageId: number, url: string) {
  try {
    // No need to await this fully, let it run in the background
    scrapeUrlAndStoreEvents(url, webpageId)
    revalidatePath("/configure") // To update status potentially
    revalidatePath("/") // To update calendar events
    return { success: `Scraping initiated for ${url}. Check status for updates.` }
  } catch (error: unknown) {
    console.error(`Failed to trigger scrape for ${url}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Failed to initiate scrape: ${errorMessage}` }
  }
}

export async function getEventsForMonth(year: number, month: number): Promise<EventRecord[]> {
  const sql = getDbClient()
  // Month is 0-indexed in JS Date, but 1-indexed in SQL. Assuming month is 1-indexed here.
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Last day of the month

  try {
    const result = await sql`
      SELECT id, title, event_date, event_time, location, description, source_url, scraped_at
      FROM events
      WHERE event_date >= ${startDate.toISOString().split("T")[0]} AND event_date <= ${endDate.toISOString().split("T")[0]}
      ORDER BY event_date, event_time
    ` as EventRecord[]
    return result
  } catch (error: unknown) {
    console.error("Failed to fetch events for month:", error)
    return []
  }
}

export async function getAllEvents(): Promise<EventRecord[]> {
  const sql = getDbClient()
  try {
    const result = await sql`
      SELECT id, title, event_date, event_time, location, description, source_url, scraped_at
      FROM events
      ORDER BY event_date DESC, event_time
    ` as EventRecord[]
    return result
  } catch (error: unknown) {
    console.error("Failed to fetch all events:", error)
    return []
  }
}
