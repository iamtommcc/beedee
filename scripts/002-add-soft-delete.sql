-- Add soft deletion column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when filtering out deleted events
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at); 