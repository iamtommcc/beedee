-- Add location_city column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Add organisation_title column to webpages_to_scrape table  
ALTER TABLE webpages_to_scrape ADD COLUMN IF NOT EXISTS organisation_title TEXT;

-- Add index for better performance when filtering by city
CREATE INDEX IF NOT EXISTS idx_events_location_city ON events(location_city); 