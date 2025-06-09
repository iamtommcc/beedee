import { getDbClient } from "@/lib/db";
import { scrapeUrlAndStoreEvents } from "@/lib/scraper";
import type { WebpageConfig } from "@/lib/types";
import { inngest, scrapingChannel } from "./client";

export const planCrawls = inngest.createFunction(
  { id: "plan-crawls" },
  { event: "crawl/sites.requested" },
  async ({ step }) => {
    const sql = getDbClient();

    if (!sql) {
      throw new Error("Database client not available");
    }

    const webpagesToScrape = await step.run("fetch-urls", async () => {
      const result = await sql`
        SELECT id, url FROM webpages_to_scrape
      ` as Pick<WebpageConfig, "id" | "url">[];
      
      console.log(`[Inngest] Found ${result.length} webpages to scrape`);
      return result;
    });

    if (webpagesToScrape.length === 0) {
      console.log("[Inngest] No webpages configured for scraping");
      return { count: 0, message: "No webpages configured" };
    }

    await step.run("dispatch-per-site", async () => {
      await Promise.all(
        webpagesToScrape.map(page =>
          inngest.send({
            name: "crawl/site.requested",
            data: { url: page.url, id: page.id },
          })
        )
      );
    });

    console.log(`[Inngest] Dispatched scraping jobs for ${webpagesToScrape.length} URLs`);
    return { count: webpagesToScrape.length };
  }
);

export const crawlSite = inngest.createFunction(
  { 
    id: "crawl-site",
    concurrency: { limit: 5 } // Adjust based on your needs
  },
  { event: "crawl/site.requested" },
  async ({ event, step, publish }) => {
    const { url, id } = event.data;

    // Create a publish function that uses our realtime channel
    const publishProgress = async (data: {
      siteId: number;
      url: string; 
      status: "reading-site" | "processing-events" | "completed" | "failed";
      message?: string;
      error?: string;
    }) => {
      await publish(scrapingChannel().progress(data));
    };

    try {
      const result = await step.run("scrape-url", async () => {
        console.log(`[Inngest] Starting scrape for ${url} (ID: ${id})`);
        return await scrapeUrlAndStoreEvents(url, id, publishProgress);
      });

      console.log(`[Inngest] Successfully completed scrape for ${url} (ID: ${id})`);
      return { url, id, success: true, result };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Publish failure status if not already published by scraper
      await publishProgress({
        siteId: id,
        url,
        status: "failed",
        error: `Inngest error: ${errorMessage}`,
      });

      console.error(`[Inngest] Error scraping ${url} (ID: ${id}):`, errorMessage);
      throw new Error(`Scraping failed for ${url}: ${errorMessage}`);
    }
  }
);

 