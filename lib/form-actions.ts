"use server"

import { getSubscriptionToken, Realtime } from "@inngest/realtime"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDbClient } from "./db"
import { inngest, scrapingChannel } from "./inngest/client"
import { WebpageConfig } from "./types"

// Define a state type for clarity, matching the client component
export interface FormState {
  error?: string
  success?: string
  timestamp: number
}

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

export async function triggerInngestScrape(url: string, id: number) {
  try {
    const { inngest } = await import("@/lib/inngest/client");
    
    const result = await inngest.send({
      name: "crawl/site.requested",
      data: { url, id },
    });

    console.log(`[Inngest] Successfully triggered scrape for ${url} (ID: ${id})`, result);
    revalidatePath("/configure");
    return { success: "Scrape initiated through Inngest workflow" };
  } catch (error: unknown) {
    console.error(`Failed to trigger Inngest scrape for ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to initiate scrape: ${errorMessage}` };
  }
}

export async function triggerFullInngestScrape() {
  try {
    const { inngest } = await import("@/lib/inngest/client");
    
    const result = await inngest.send({
      name: "crawl/sites.requested",
      data: { urls: [] }, // URLs will be fetched from DB in the planner function
    });

    console.log("[Inngest] Successfully triggered full scraping workflow", result);
    revalidatePath("/configure");
    revalidatePath("/"); // Update events display
    return { success: "Full scraping workflow initiated successfully" };
  } catch (error: unknown) {
    console.error("Failed to trigger full Inngest scrape:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to initiate full scraping workflow: ${errorMessage}` };
  }
}

export async function getScrapingProgressToken(): Promise<Realtime.Token<typeof scrapingChannel, ["progress"]>> {
  const token = await getSubscriptionToken(inngest, {
    channel: scrapingChannel(),
    topics: ["progress"],
  });

  return token;
}

export async function getWebpageById(id: number): Promise<WebpageConfig | null> {
  const sql = getDbClient();
  if (!sql) {
    throw new Error("Database client not available");
  }

  const result = await sql`
    SELECT * FROM webpages_to_scrape WHERE id = ${id} LIMIT 1
  ` as WebpageConfig[];

  return result[0] || null;
}

export async function getAllWebpages(): Promise<WebpageConfig[]> {
  const sql = getDbClient();
  if (!sql) {
    throw new Error("Database client not available");
  }

  const result = await sql`
    SELECT 
      w.*,
      COALESCE(COUNT(e.id), 0) as event_count
    FROM webpages_to_scrape w
    LEFT JOIN events e ON w.id = e.webpage_config_id AND e.deleted_at IS NULL
    GROUP BY w.id
    ORDER BY w.created_at DESC
  ` as WebpageConfig[];

  return result;
}
