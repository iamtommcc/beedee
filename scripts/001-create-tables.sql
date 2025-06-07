-- Enable uuid-ossp extension if not already enabled (usually available in Neon)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table to store webpages to be scraped
CREATE TABLE IF NOT EXISTS webpages_to_scrape (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  status TEXT, -- e.g., 'pending', 'success', 'failed_no_content', 'failed_xcrawl_error', 'failed_exception'
  error_message TEXT
);

-- Table to store extracted event data
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  description TEXT,
  source_url TEXT NOT NULL, -- The URL of the page where the event was found
  webpage_config_id INTEGER REFERENCES webpages_to_scrape(id) ON DELETE CASCADE, -- Link to the source webpage config
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(title, event_date, source_url) -- Basic uniqueness constraint
);

-- Optional: Index for faster querying of events by date
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_webpages_url ON webpages_to_scrape(url);
