-- Add categories column to webpages_to_scrape table
ALTER TABLE webpages_to_scrape 
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]';

-- Create an index for categories to improve query performance
CREATE INDEX IF NOT EXISTS idx_webpages_categories ON webpages_to_scrape USING GIN (categories);
