"use client"

import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface ICalSubscriptionModalProps {
  locationFilter?: string
}

export function ICalSubscriptionModal({ locationFilter }: ICalSubscriptionModalProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const icalUrl = locationFilter 
    ? `${baseUrl}/api/ical?location_city=${encodeURIComponent(locationFilter)}`
    : `${baseUrl}/api/ical`

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
    <div className="space-y-4">
      {/* iCal URL Display */}
      <div className="space-y-2">
        <label htmlFor="ical-url-modal" className="text-sm font-medium">
          Calendar subscription URL:
        </label>
        <div className="flex gap-2">
          <input
            id="ical-url-modal"
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
        {locationFilter && (
          <p className="text-xs text-muted-foreground">
            This feed is filtered to show events for: <strong>{locationFilter}</strong>
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">How to subscribe:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Google Calendar:</strong> Click &quot;+&quot; → &quot;From URL&quot; → paste the URL above</li>
          <li><strong>Apple Calendar:</strong> File → New Calendar Subscription → paste the URL</li>
          <li><strong>Outlook:</strong> Add calendar → From internet → paste the URL</li>
          <li><strong>Thunderbird:</strong> Right-click calendar list → New Calendar → On the Network</li>
        </ul>
        <p className="text-xs mt-2">
          💡 <strong>Tip:</strong> The calendar feed updates automatically when new events are added.
        </p>
      </div>
    </div>
  )
} 