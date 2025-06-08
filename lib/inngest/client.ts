import { channel, realtimeMiddleware, topic } from "@inngest/realtime";
import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

type CrawlSitesRequested = { 
  data: { 
    urls: Array<{ url: string; id: number }> 
  } 
};

type CrawlSiteRequested = { 
  data: { 
    url: string; 
    id: number 
  } 
};

type Events = {
  "crawl/sites.requested": CrawlSitesRequested;
  "crawl/site.requested": CrawlSiteRequested;
};

// Define scraping progress schema
const ScrapingProgressSchema = z.object({
  siteId: z.number(),
  url: z.string(),
  status: z.enum(["reading-site", "processing-events", "completed", "failed"]),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Create a global channel for all scraping progress updates
export const scrapingChannel = channel("scraping-progress")
  .addTopic(topic("progress").schema(ScrapingProgressSchema));

export const inngest = new Inngest({
  id: "beedee-scraper",
  schemas: new EventSchemas().fromRecord<Events>(),
  middleware: [realtimeMiddleware()],
}); 