"use server"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateObject } from "ai"
import console from "console"
import { convert } from "html-to-text"
import { z } from "zod"
import { getDbClient } from "./db"
import { createCrawl } from "./playwright-crawler"
import type { EventData } from "./types"

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
})

// Initialize Playwright crawler client
const crawlApp = createCrawl({
  maxRetry: 1,
  timeout: 10000
})
console.log("[Scraper] Playwright crawler client initialized.")

// Zod schema for structured event extraction
const EventSchema = z.object({
  title: z.string().describe("The title or name of the event"),
  event_date: z.string().describe("The date of the event in YYYY-MM-DD format"),
  event_time: z.string().optional().describe("The time of the event in HH:MM format (24-hour)"),
  location: z.string().optional().describe("The location of the event (physical address or 'Online' if virtual)"),
  location_city: z.string().optional().describe("The city where the event takes place (e.g. Brisbane, Adelaide, Sydney) or 'Online' for virtual events. Strictly NO suffixes like 'QLD' or 'City'. Major cities only, consolidate suburbs into their major city."),
  description: z.string().optional().describe("A brief description of the event"),
  event_url: z.string().optional().describe("The direct URL/link to this specific event's page (often found in brackets next to event titles like 'Event Title [https://example.com/event]')"),
})

const EventsListSchema = z.object({
  organisation_title: z.string().optional().describe("The name of the organization hosting these events"),
  events: z.array(EventSchema).describe("List of future events found on the webpage")
})

// Convert HTML to structured text while preserving semantic elements
function preprocessHTML(html: string): string {
  try {
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: 'h1', format: 'heading' },
        { selector: 'h2', format: 'heading' },
        { selector: 'h3', format: 'heading' },
        { selector: 'h4', format: 'heading' },
        { selector: 'h5', format: 'heading' },
        { selector: 'h6', format: 'heading' },
        { selector: 'p', format: 'paragraph' },
        { selector: 'ul', format: 'unorderedList' },
        { selector: 'ol', format: 'unorderedList' },
        { selector: 'table', format: 'dataTable' },
        { selector: 'a', format: 'anchor' },
        { selector: 'time', format: 'inline' },
        { selector: 'address', format: 'block' },
        { selector: '.event', format: 'block' },
        { selector: '.events', format: 'block' },
        { selector: '[class*="event"]', format: 'block' },
        { selector: '[class*="date"]', format: 'block' },
        { selector: '[class*="time"]', format: 'block' },
        { selector: '[class*="location"]', format: 'block' }
      ]
    })
  } catch (error) {
    console.error('[Scraper] Error preprocessing HTML with html-to-text:', error)
    // Fallback: return original HTML if preprocessing fails
    return html
  }
}

// Helper function to convert relative URLs to absolute URLs
function makeAbsoluteUrl(eventUrl: string, sourceUrl: string): string {
  if (!eventUrl) return eventUrl;
  
  // If already absolute URL, return as-is
  if (eventUrl.startsWith('http://') || eventUrl.startsWith('https://')) {
    return eventUrl;
  }
  
  // If relative URL starting with "/", prepend the domain from sourceUrl
  if (eventUrl.startsWith('/')) {
    try {
      const url = new URL(sourceUrl);
      return `${url.protocol}//${url.host}${eventUrl}`;
    } catch (error) {
      console.warn(`[Scraper] Failed to parse source URL ${sourceUrl}, returning relative URL as-is:`, error);
      return eventUrl;
    }
  }
  
  // For other relative URLs (not starting with /), return as-is for now
  // Could be enhanced to handle relative paths like "event.html" in the future
  return eventUrl;
}

// AI-powered event extraction using Gemini 2.5 flash preview
async function extractEventsFromHTML(html: string, sourceUrl: string): Promise<{ events: EventData[], organisationTitle?: string }> {
  if (!html) {
    console.warn(`[Scraper] No HTML content provided for ${sourceUrl}`)
    return { events: [] }
  }

  // Preprocess HTML to reduce size while preserving semantic structure
  const processedText = preprocessHTML(html)
  
  // If preprocessing failed and returned original HTML, log a warning
  if (processedText === html) {
    console.warn(`[Scraper] HTML preprocessing failed for ${sourceUrl}, using original HTML`)
  } else {
    console.log(`[Scraper] HTML preprocessed from ${html.length} to ${processedText.length} characters for ${sourceUrl}`)
  }

  const today = new Date().toISOString().split("T")[0]
  
  try {
    console.log(`[Scraper] Using Gemini 2.5 flash preview to extract events from ${sourceUrl}`)
    
    const result = await generateObject({
      model: google("gemini-2.5-flash-preview-04-17"),
      schema: EventsListSchema,
      prompt: `
        Analyze this structured text content (ripped from a webpage) and extract all future events (events that occur on or after ${today}).
        
        Look for:
        - Organization name or company hosting these events
        - Event titles/names
        - Dates (convert to YYYY-MM-DD format)
        - Times (convert to HH:MM 24-hour format)
        - Locations (physical addresses or "Online" for virtual events)
        - Location cities (just the city name like Brisbane, Adelaide, Sydney, or "Online" for virtual events)
        - Descriptions
        - Event URLs (direct links to specific event pages, often found in brackets after event titles like "Event Title [https://example.com/event]" or "Event Title [/event/123]")
        
        Only include events that:
        1. Have a clear event date that is today (${today}) or in the future
        2. Are actual events (not just general information)
        3. Have enough information to be meaningful

        DO NOT include or make up events that are not in the content.
        
        Note: The text has been processed so that anchor tags appear as "text [URL]" format where the URL in brackets is the direct link to that specific content.
        
        Structured text content:
        ${processedText}
      `
    })

    const futureEvents: EventData[] = result.object.events
      .filter(event => event.event_date && event.event_date >= today)
      .map(event => {
        let processedEventUrl = event.event_url;
        if (event.event_url) {
          processedEventUrl = makeAbsoluteUrl(event.event_url, sourceUrl);
          if (processedEventUrl !== event.event_url) {
            console.log(`[Scraper] Converted relative URL "${event.event_url}" to absolute URL "${processedEventUrl}" for event "${event.title}"`);
          }
        }
        
        return {
          title: event.title,
          event_date: event.event_date,
          event_time: event.event_time,
          location: event.location,
          location_city: event.location_city,
          description: event.description,
          source_url: sourceUrl,
          event_url: processedEventUrl
        };
      })

    console.log(`[Scraper] Gemini 2.5 flash preview extracted ${futureEvents.length} future events from ${sourceUrl}`)
    return { 
      events: futureEvents,
      organisationTitle: result.object.organisation_title
    }

  } catch (error) {
    console.error(`[Scraper] Error using Gemini 2.5 flash preview for ${sourceUrl}:`, error)
    return { events: [] }
  }
}

export async function scrapeUrlAndStoreEvents(
  url: string, 
  webpageConfigId: number,
  publishProgress?: (data: {
    siteId: number;
    url: string; 
    status: "reading-site" | "processing-events" | "completed" | "failed";
    message?: string;
    error?: string;
  }) => Promise<void>
) {
  console.log(`[Scraper] scrapeUrlAndStoreEvents called for URL: ${url}, ID: ${webpageConfigId}`)
  const sql = getDbClient()
  if (!sql) {
    const error = "Database client not available"
    console.error(`[Scraper] DB client not available for ${url}. Aborting.`)
    await publishProgress?.({
      siteId: webpageConfigId,
      url,
      status: "failed",
      error
    })
    return { error }
  }

  // Publish and update database status to scraping
  await publishProgress?.({
    siteId: webpageConfigId,
    url,
    status: "reading-site",
    message: "Starting to scrape website"
  })

  await sql`
    UPDATE webpages_to_scrape 
    SET status = 'scraping', error_message = NULL
    WHERE id = ${webpageConfigId}
  `

  try {
    console.log(`[Scraper] Attempting to fetch page content: ${url}`)
    
    const crawlResult = await crawlApp.crawlPage(url)
    const htmlContent = crawlResult.html

    if (!htmlContent) {
      const error = "Successfully fetched URL but no HTML content was returned"
      console.warn(`[Scraper] No HTML content fetched for ${url}`)
      await sql`
        UPDATE webpages_to_scrape 
        SET last_scraped_at = NOW(), status = 'failed_no_html', error_message = ${error}
        WHERE id = ${webpageConfigId}
      `
      await publishProgress?.({
        siteId: webpageConfigId,
        url,
        status: "failed",
        error
      })
      return { error }
    }
    console.log(`[Scraper] Fetch successful for ${url}. HTML content length: ${htmlContent.length}`)

    // Publish processing status
    await publishProgress?.({
      siteId: webpageConfigId,
      url,
      status: "processing-events",
      message: "Extracting events from page content"
    })

    const { events: extractedEvents, organisationTitle } = await extractEventsFromHTML(htmlContent, url)
    console.log(`[Scraper] Extracted ${extractedEvents.length} potential events from ${url}`)

    // Update organisation title if found
    if (organisationTitle) {
      await sql`
        UPDATE webpages_to_scrape 
        SET organisation_title = ${organisationTitle}
        WHERE id = ${webpageConfigId}
      `
      console.log(`[Scraper] Updated organisation title to: ${organisationTitle}`)
    }

    if (extractedEvents.length === 0) {
      const message = "Scraped successfully, but no distinct events were identified"
      await sql`
        UPDATE webpages_to_scrape 
        SET last_scraped_at = NOW(), status = 'success_no_events_found', error_message = ${message}
        WHERE id = ${webpageConfigId}
      `
      await publishProgress?.({
        siteId: webpageConfigId,
        url,
        status: "completed",
        message: `Completed: ${message}`
      })
      return { success: true, eventsFound: 0 }
    }

    // Insert events with better error handling
    let insertedCount = 0;
    let failedInserts = 0;
    
    for (const event of extractedEvents) {
      try {
        const existingEvent = await sql`
          SELECT id FROM events
          WHERE title = ${event.title} AND event_date = ${new Date(event.event_date)} AND source_url = ${event.source_url}
            AND deleted_at IS NULL
          LIMIT 1
        `
        if (existingEvent.length === 0) {
          await sql`
            INSERT INTO events (title, event_date, event_time, location, location_city, description, source_url, event_url, webpage_config_id)
            VALUES (${event.title}, ${new Date(event.event_date)}, ${event.event_time || null}, ${event.location || null}, ${event.location_city || null}, ${event.description || null}, ${event.source_url}, ${event.event_url || null}, ${webpageConfigId})
          `
          console.log(`[Scraper] Inserted new event: "${event.title}" from ${url}`)
          insertedCount++
        } else {
          console.log(`[Scraper] Event already exists: "${event.title}" from ${url}`)
        }
      } catch (dbError: unknown) {
        failedInserts++
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error'
        console.error(`[Scraper] DB error inserting event from ${url}: ${errorMessage}`)
      }
    }

    // Handle partial failures
    if (failedInserts > 0 && insertedCount === 0) {
      const error = `Failed to insert any events (${failedInserts} failures)`
      await sql`
        UPDATE webpages_to_scrape SET status = 'failed_db_event_insert', error_message = ${error} WHERE id = ${webpageConfigId}
      `
      await publishProgress?.({
        siteId: webpageConfigId,
        url,
        status: "failed",
        error
      })
      return { error }
    }

    // Success case
    const successMessage = `Successfully processed ${extractedEvents.length} events (${insertedCount} new, ${extractedEvents.length - insertedCount} existing)`
    await sql`
      UPDATE webpages_to_scrape SET last_scraped_at = NOW(), status = 'success', error_message = NULL WHERE id = ${webpageConfigId}
    `
    await publishProgress?.({
      siteId: webpageConfigId,
      url,
      status: "completed",
      message: successMessage
    })
    
    return { success: true, eventsFound: extractedEvents.length, newEvents: insertedCount }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error(`[Scraper] CRITICAL error during scraping ${url}: ${errorMessage}`, errorStack)
    
    await sql`
      UPDATE webpages_to_scrape SET last_scraped_at = NOW(), status = 'failed_exception', error_message = ${errorMessage} WHERE id = ${webpageConfigId}
    `
    await publishProgress?.({
      siteId: webpageConfigId,
      url,
      status: "failed",
      error: errorMessage
    })
    
    return { error: errorMessage }
  }
}

export type { EventData }
