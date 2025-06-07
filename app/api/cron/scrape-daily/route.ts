import { getDbClient } from "@/lib/db"
import { scrapeUrlAndStoreEvents } from "@/lib/scraper"
import type { WebpageConfig } from "@/lib/types"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic" // Ensures the route is not statically cached

export async function GET() {
  console.log("[Cron] Daily scraping job started.")
  const sql = getDbClient()

  if (!sql) {
    console.error("[Cron] Database client not available.")
    return NextResponse.json({ error: "Database client not configured" }, { status: 500 })
  }

  try {
    const webpagesToScrape = await sql`
    SELECT id, url FROM webpages_to_scrape
  ` as Pick<WebpageConfig, "id" | "url">[]

    if (webpagesToScrape.length === 0) {
      console.log("[Cron] No webpages configured for scraping.")
      return NextResponse.json({ message: "No webpages configured." })
    }

    console.log(`[Cron] Found ${webpagesToScrape.length} webpages to scrape.`)

    // Intentionally not awaiting all promises here to allow them to run in parallel up to platform limits.
    // For a large number of URLs, a more robust queueing system would be needed.
    webpagesToScrape.map((page) =>
      scrapeUrlAndStoreEvents(page.url, page.id).catch((err) =>
        console.error(`[Cron] Error scraping ${page.url} (ID: ${page.id}):`, err),
      ),
    )

    // We can await all, but this might timeout for many URLs on serverless.
    // For now, let them run. The function `scrapeUrlAndStoreEvents` updates status individually.
    // Promise.all(scrapingPromises); // This would wait for all to complete or fail.

    console.log("[Cron] Scraping tasks initiated for all configured webpages.")
    return NextResponse.json({ message: `Scraping initiated for ${webpagesToScrape.length} URLs.` })
  } catch (error: unknown) {
    console.error("[Cron] Error fetching webpages for scraping:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to start daily scrape: ${errorMessage}` }, { status: 500 })
  }
}
