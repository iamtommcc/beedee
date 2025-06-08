# Inngest Setup for Scraping Workflow

This project now uses Inngest to manage scraping workflows instead of a simple cron job. This provides better reliability, observability, and concurrency control.

## What Changed

- **Before**: Simple cron job at `/api/cron/scrape-daily` that fired all scrapes simultaneously
- **After**: Inngest workflow that:
  1. Plans crawls by fetching URLs from database
  2. Fans out to individual scrape jobs with proper concurrency limits
  3. Provides retry logic, observability, and error handling

## Development Setup

1. **Install Inngest CLI** (if not already installed):
   ```bash
   npx inngest@latest dev
   ```

2. **Start your Next.js dev server**:
   ```bash
   npm run dev
   ```

3. **Start Inngest dev server** (in a separate terminal):
   ```bash
   npx inngest@latest dev
   ```

   This will start the Inngest development server and automatically discover your functions at `http://localhost:3000/api/inngest`.

## How It Works

### Event Flow
```
User/Scheduler → POST /api/initiate-scrape → "crawl/sites.requested" event
                                                        ↓
                              planCrawls function (fetches URLs from DB)
                                                        ↓
                           emits N× "crawl/site.requested" events
                                                        ↓
                                crawlSite function (one per URL)
```

### Functions

1. **planCrawls** (`plan-crawls`):
   - Triggered by `crawl/sites.requested` event
   - Fetches all URLs from `webpages_to_scrape` table
   - Fans out individual `crawl/site.requested` events

2. **crawlSite** (`crawl-site`):
   - Triggered by `crawl/site.requested` event  
   - Executes the actual scraping for a single URL
   - Has concurrency limit of 10 (configurable)

### API Endpoints

- `POST /api/initiate-scrape` - Triggers full scraping workflow (also available as server action)
- `/api/inngest` - Inngest function handler (used by Inngest)

### Server Actions

- `triggerFullInngestScrape()` - Triggers full scraping workflow
- `triggerInngestScrape(url, id)` - Triggers scrape for single URL

## Production Deployment

### Environment Variables
Set these in your production environment:

```env
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Inngest Cloud Setup

1. **Create Inngest account** at [inngest.com](https://inngest.com)

2. **Create a new app** and get your keys

3. **Deploy your app** with the environment variables

4. **Register your functions** by visiting your deployed `/api/inngest` endpoint in Inngest dashboard

## Triggering Scrapes

### Via UI
- Go to `/configure` page
- Click "Start Scraping All URLs" button
- Individual scrape buttons on each URL row

### Via API
```bash
# Trigger all URLs
curl -X POST http://localhost:3000/api/initiate-scrape
```

### Via Server Actions
```typescript
// In your server components or actions
import { triggerFullInngestScrape, triggerInngestScrape } from "@/lib/form-actions";

// Trigger all URLs
await triggerFullInngestScrape();

// Trigger single URL
await triggerInngestScrape("https://example.com", 1);
```

### Via Cron (if needed)
You can still trigger the workflow on a schedule by hitting the API endpoint:

```bash
# Add to your cron or use Vercel Cron
curl -X POST https://your-app.vercel.app/api/initiate-scrape
```

## Monitoring

- **Local Development**: View functions and executions at Inngest dev UI (usually http://localhost:8288)
- **Production**: View in Inngest dashboard at [app.inngest.com](https://app.inngest.com)

## Configuration

### Concurrency Limits
Adjust in `lib/inngest/functions.ts`:

```typescript
export const crawlSite = inngest.createFunction(
  { 
    id: "crawl-site",
    concurrency: { limit: 10 } // Adjust this value
  },
  // ...
);
```

### Function IDs
- `plan-crawls`: Main planning function
- `crawl-site`: Individual scraping function

## Benefits Over Cron

1. **Reliability**: Automatic retries and error handling
2. **Observability**: Full execution history and logs
3. **Concurrency Control**: Prevent overwhelming target sites or Vercel limits
4. **Scalability**: Better handling of large numbers of URLs
5. **Development**: Easy local testing with Inngest dev server

## Troubleshooting

### "invalid status code: 500" in Inngest logs

This usually indicates an error in the function execution. Check:

1. **Database connection**: Ensure your database environment variables are set
2. **Function errors**: Check your Next.js server logs for detailed error messages
3. **Dependencies**: Make sure all required packages are installed
4. **Environment variables**: Verify GEMINI_API_KEY and database credentials

### Testing Individual Components

```bash
# Test the API trigger
curl -X POST http://localhost:3000/api/initiate-scrape

# Test individual URL scraping via UI (go to /configure page and click scrape buttons)
```

### Common Issues

- **Module not found**: Restart your dev server after installing Inngest
- **Database errors**: Check your Neon/PostgreSQL connection string
- **API key errors**: Verify your GEMINI_API_KEY environment variable 