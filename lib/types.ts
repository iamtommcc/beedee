export interface WebpageConfig {
  id: number
  url: string
  organisation_title?: string
  created_at: string
  last_scraped_at?: string | null
  status?: string | null
  error_message?: string | null
  event_count?: number
  categories?: string[]
}

// Category definitions for website classification
export const CATEGORIES = [
  { value: "education", label: "Education" },
  { value: "government", label: "Government" },
  { value: "consumer_goods_non_retail", label: "Consumer Goods (Non Retail)" },
  { value: "restructuring", label: "Restructuring" },
  { value: "health_and_aged_care", label: "Health and aged care" },
  { value: "it_media_telecommunications", label: "IT / Media / Telecommunications" },
  { value: "manufacturing_and_industrial", label: "Manufacturing and industrial" },
  { value: "mining_and_energy", label: "Mining and energy" },
  { value: "not_for_profit", label: "Not for Profit" },
  { value: "private_equity", label: "Private Equity" },
  { value: "property_construction_and_infrastructure", label: "Property, Construction and Infrastructure" },
  { value: "retail", label: "Retail" },
  { value: "services_professional_services", label: "Services / Professional Services" },
  { value: "transport_and_logistics", label: "Transport and Logistics" },
  { value: "financial_institutions", label: "Financial Institutions" },
  { value: "other", label: "Other" },
]

export type CategoryValue = typeof CATEGORIES[number]["value"]

export interface EventData {
  title: string
  event_date: string // YYYY-MM-DD
  event_time?: string // HH:MM
  location?: string
  location_city?: string
  description?: string
  source_url: string
  event_url?: string // Direct link to the specific event listing page
}

export interface EventRecord extends EventData {
  id: number
  scraped_at: string // This was string, assuming it's a timestamp string
  deleted_at?: string | null // For soft deletion
  webpage_config_id?: number
  organisation_title?: string
  categories?: string[]
}
