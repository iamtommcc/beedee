-- Add event_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_url TEXT;

-- Add index for better performance when filtering by event URL
CREATE INDEX IF NOT EXISTS idx_events_event_url ON events(event_url); 