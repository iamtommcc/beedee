"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ICalSubscriptionProps {
  locationCities: string[]
}

export function ICalSubscription({ locationCities }: ICalSubscriptionProps) {
  const [selectedCity, setSelectedCity] = useState<string>('all')
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const icalUrl = selectedCity === 'all' 
    ? `${baseUrl}/api/ical`
    : `${baseUrl}/api/ical?location_city=${encodeURIComponent(selectedCity)}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl)
      toast.success("iCal URL copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast.error("Failed to copy URL")
    }
  }

  const openICalUrl = () => {
    window.open(icalUrl, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Subscribe to Calendar
        </CardTitle>
        <CardDescription>
          Get live event updates in your calendar app. The feed updates automatically when new events are added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* City Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="ical-city-filter" className="text-sm font-medium whitespace-nowrap">
            Filter by city:
          </label>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger id="ical-city-filter" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locationCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* iCal URL Display */}
        <div className="space-y-2">
          <label htmlFor="ical-url" className="text-sm font-medium">
            Calendar subscription URL:
          </label>
          <div className="flex gap-2">
            <input
              id="ical-url"
              type="text"
              value={icalUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted/50 font-mono"
            />
            <Button onClick={copyToClipboard} size="sm" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={openICalUrl} size="sm" variant="outline">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium">How to subscribe:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Google Calendar:</strong> Click "+" → "From URL" → paste the URL above</li>
            <li><strong>Apple Calendar:</strong> File → New Calendar Subscription → paste the URL</li>
            <li><strong>Outlook:</strong> Add calendar → From internet → paste the URL</li>
            <li><strong>Thunderbird:</strong> Right-click calendar list → New Calendar → On the Network</li>
          </ul>
          <p className="text-xs mt-2">
            💡 <strong>Tip:</strong> Bookmark this page to easily get updated URLs when you change city filters.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 