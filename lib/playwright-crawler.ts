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
  const { maxRetry = 3, timeout = 10000 } = options;

  return {
    async crawlPage(url: string): Promise<CrawlPageResult> {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetry; attempt++) {
        try {
          console.log(`[PlaywrightCrawler] Attempt ${attempt}/${maxRetry} for ${url}`);
          
          // Use serverless chromium on Vercel, local Chromium otherwise
          const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
          
          const browserOptions = isVercel 
            ? {
                args: [
                  ...chromium.args,
                  '--no-first-run',
                  '--disable-blink-features=AutomationControlled',
                  '--disable-web-security',
                  '--disable-features=VizDisplayCompositor'
                ],
                executablePath: await chromium.executablePath(),
              }
            : {
                args: [
                  '--no-first-run',
                  '--disable-blink-features=AutomationControlled',
                  '--disable-web-security',
                  '--disable-features=VizDisplayCompositor'
                ]
              };

          console.log(`[PlaywrightCrawler] Running in ${isVercel ? 'Vercel' : 'local'} environment`);
          const browser = await playwright.launch(browserOptions);

          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
            extraHTTPHeaders: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            }
          });

          const page = await context.newPage();
          
          // Set timeout for navigation
          page.setDefaultTimeout(timeout);
          
          await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout 
          });

          // Add human-like delay
          await page.waitForTimeout(Math.random() * 2000 + 1000);

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
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt * 2));
        }
      }
      
      throw lastError || new Error('Failed to crawl page after all retry attempts');
    }
  };
} 