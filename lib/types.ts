export interface WebpageConfig {
  id: number
  url: string
  organisation_title?: string
  created_at: string
  last_scraped_at?: string | null
  status?: string | null
  error_message?: string | null
}

export interface EventData {
  title: string
  event_date: string // YYYY-MM-DD
  event_time?: string // HH:MM
  location?: string
  location_city?: string
  description?: string
  source_url: string
}

export interface EventRecord extends EventData {
  id: number
  event_date: Date // Ensure this is Date type for calendar
  scraped_at: string // This was string, assuming it's a timestamp string
  deleted_at?: string | null // For soft deletion
  webpage_config_id?: number
  organisation_title?: string
}
