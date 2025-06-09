import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

const fetchFromScraperApi = async (url: string) => {
  const response = await fetch(`https://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${url}&render=true`);
  return response.text();
}


interface CrawlOptions {
  maxRetry?: number;
  timeout?: number;
}

interface CrawlPageResult {
  html: string;
  source: 'playwright' | 'scraperapi';
}

interface CrawlApp {
  crawlPage(url: string): Promise<CrawlPageResult>;
}

export function createCrawl(options: CrawlOptions = {}): CrawlApp {
  const { maxRetry = 1, timeout = 10000 } = options;

  return {
    async crawlPage(url: string): Promise<CrawlPageResult> {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetry; attempt++) {
        let browser = null;
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
          browser = await playwright.launch(browserOptions);

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

          // Get HTML content
          const html = await page.content();

          console.log(`[PlaywrightCrawler] Successfully loaded ${url} on attempt ${attempt}`);
          
          return {
            html,
            source: 'playwright'
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`[PlaywrightCrawler] Attempt ${attempt}/${maxRetry} failed for ${url}:`, lastError.message);
          
          if (attempt === maxRetry) {
            // Fallback to ScraperAPI when all Playwright retries fail
            console.log(`[PlaywrightCrawler] All Playwright attempts failed, falling back to ScraperAPI for ${url}`);
            try {
              const html = await fetchFromScraperApi(url);
              console.log(`[PlaywrightCrawler] Successfully scraped ${url} using ScraperAPI`);
              return {
                html,
                source: 'scraperapi'
              };
            } catch (scraperError) {
              console.error(`[PlaywrightCrawler] ScraperAPI also failed for ${url}:`, scraperError);
              throw lastError;
            }
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt * 2));
        } finally {
          // Always close the browser if it was opened
          if (browser) {
            try {
              await browser.close();
            } catch (e) {
              console.warn(`[PlaywrightCrawler] Error closing browser for ${url}:`, e);
            }
          }
        }
      }
      
      throw lastError || new Error('Failed to crawl page after all retry attempts');
    }
  };
} 