import chromium from '@sparticuz/chromium';
import type { Browser, Page } from 'playwright-core';
import { chromium as playwright } from 'playwright-core';

interface CrawlOptions {
  maxRetry?: number;
  timeout?: number;
}

interface CrawlPageResult {
  data: {
    page: Page;
    browser: Browser;
  };
}

interface CrawlApp {
  crawlPage(url: string): Promise<CrawlPageResult>;
}

export function createCrawl(options: CrawlOptions = {}): CrawlApp {
  const { maxRetry = 3, timeout = 5000 } = options;

  return {
    async crawlPage(url: string): Promise<CrawlPageResult> {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetry; attempt++) {
        try {
          console.log(`[PlaywrightCrawler] Attempt ${attempt}/${maxRetry} for ${url}`);
          console.log(await chromium.executablePath());
          const browser = await playwright.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
          });

          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          });

          const page = await context.newPage();
          
          // Set timeout for navigation
          page.setDefaultTimeout(timeout);
          
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout 
          });

          console.log(`[PlaywrightCrawler] Successfully loaded ${url} on attempt ${attempt}`);
          
          return {
            data: {
              page,
              browser
            }
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`[PlaywrightCrawler] Attempt ${attempt}/${maxRetry} failed for ${url}:`, lastError.message);
          
          if (attempt === maxRetry) {
            throw lastError;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      throw lastError || new Error('Failed to crawl page after all retry attempts');
    }
  };
} 