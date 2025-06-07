"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDbClient } from "./db"

// Define a state type for clarity, matching the client component
type FormState = {
  success?: string
  error?: string
  timestamp?: number // Add timestamp
} | null

// Corrected function signature: accepts prevState and formData
export async function addWebpage(prevState: FormState, formData: FormData): Promise<FormState> {
  const sql = getDbClient()
  const url = formData.get("url") as string

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return { error: "Invalid URL format.", timestamp: Date.now() }
  }

  try {
    const existing = await sql`SELECT id FROM webpages_to_scrape WHERE url = ${url}`
    if (existing.length > 0) {
      return { error: "URL already exists.", timestamp: Date.now() }
    }

    await sql`
      INSERT INTO webpages_to_scrape (url, status) 
      VALUES (${url}, 'pending')
    `
    revalidatePath("/configure")
    return { success: "URL added successfully. It will be scraped soon.", timestamp: Date.now() }
  } catch (error: unknown) {
    console.error("Failed to add webpage:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Database error: ${errorMessage}`, timestamp: Date.now() }
  }
}

export async function deleteWebpage(id: number) {
  const sql = getDbClient()
  try {
    await sql`DELETE FROM webpages_to_scrape WHERE id = ${id}`
    // Also delete associated events
    await sql`DELETE FROM events WHERE webpage_config_id = ${id}`
    revalidatePath("/configure")
    revalidatePath("/") // Events might change
    return { success: "URL and associated events deleted successfully." }
  } catch (error: unknown) {
    console.error("Failed to delete webpage:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Database error: ${errorMessage}` }
  }
}

export async function deleteEvent(eventId: number) {
  const sql = getDbClient()
  try {
    await sql`
      UPDATE events 
      SET deleted_at = NOW() 
      WHERE id = ${eventId} AND deleted_at IS NULL
    `
    revalidatePath("/") // Events might change
    return { success: "Event deleted successfully." }
  } catch (error: unknown) {
    console.error("Failed to soft delete event:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { error: `Database error: ${errorMessage}` }
  }
}

export async function deleteAllEvents() {
  const sql = getDbClient()
  try {
    await sql`DELETE FROM events`
    revalidatePath("/")
    revalidatePath("/configure")
    redirect("/")
  } catch (error: unknown) {
    console.error("Failed to delete all events:", error)
    redirect("/")
  }
}
