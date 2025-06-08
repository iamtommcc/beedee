"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteWebpage, getAllWebpages, getScrapingProgressToken, triggerInngestScrape } from "@/lib/form-actions"
import type { WebpageConfig } from "@/lib/types"
import { useInngestSubscription } from "@inngest/realtime/hooks"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

async function handleDelete(id: number) {
  if (confirm("Are you sure you want to delete this URL? This will also delete associated events.")) {
    return deleteWebpage(id)
  }
  return null
}

async function handleScrape(url: string, id: number) {
  return await triggerInngestScrape(url, id)
}

type ScrapingProgress = {
  status: "reading-site" | "processing-events" | "completed" | "failed"
  message?: string
  error?: string
}

export function UrlList({ webpages: initialWebpages }: { webpages: WebpageConfig[] }) {
  // Keep local copy of webpages that gets updated
  const [webpages, setWebpages] = useState<WebpageConfig[]>(initialWebpages)
  const [scrapingProgress, setScrapingProgress] = useState<Record<number, ScrapingProgress>>({})

  // Subscribe to realtime scraping progress updates
  const { data: progressData } = useInngestSubscription({
    refreshToken: getScrapingProgressToken,
  })

  // Update local progress state when new realtime data arrives
  useEffect(() => {
    if (progressData && progressData.length > 0) {
      const latestUpdate = progressData[progressData.length - 1]
      if (latestUpdate?.data) {
        const siteId = latestUpdate.data.siteId
        const progressStatus = latestUpdate.data.status
        
        setScrapingProgress(prev => ({
          ...prev,
          [siteId]: {
            status: progressStatus,
            message: latestUpdate.data.message,
            error: latestUpdate.data.error,
          }
        }))

        // When scraping completes or fails, refresh the webpage data from database
        if (progressStatus === "completed" || progressStatus === "failed") {
          // Refresh the webpage data to get the updated database status
          getAllWebpages().then(updatedWebpages => {
            setWebpages(updatedWebpages)
          }).catch(error => {
            console.error("Failed to refresh webpage data:", error)
          })

          // Clear progress after 3 seconds
          setTimeout(() => {
            setScrapingProgress(prev => {
              const newState = { ...prev }
              delete newState[siteId]
              return newState
            })
          }, 3000)
        }
      }
    }
  }, [progressData])

  // Update initial webpages when props change
  useEffect(() => {
    setWebpages(initialWebpages)
  }, [initialWebpages])

  const onAction = async (promise: Promise<{ success?: string; error?: string } | null>) => {
    const result = await promise
    if (result?.success) {
      toast.success(result.success)
      // Refresh data after any action
      try {
        const updatedWebpages = await getAllWebpages()
        setWebpages(updatedWebpages)
      } catch (error) {
        console.error("Failed to refresh webpage data:", error)
      }
    }
    if (result?.error) {
      toast.error(result.error)
    }
  }

  const getDisplayStatus = (webpage: WebpageConfig, progress?: ScrapingProgress) => {
    // If there's active progress, show that as priority
    if (progress) {
      return {
        label: progress.status === "reading-site" ? "📖 Reading site" :
               progress.status === "processing-events" ? "⚙️ Processing events" :
               progress.status === "completed" ? "✅ Completed" :
               "❌ Failed",
        className: progress.status === "reading-site" ? "bg-yellow-100 text-yellow-800" :
                  progress.status === "processing-events" ? "bg-blue-100 text-blue-800" :
                  progress.status === "completed" ? "bg-green-100 text-green-800" :
                  "bg-red-100 text-red-800",
        message: progress.message,
        error: progress.error
      }
    }

    // Show friendly database status labels
    const getFriendlyStatus = (status: string | null | undefined) => {
      switch (status) {
        case "success":
          return "✅ Ready"
        case "success_no_events_found":
          return "✅ No events found"
        case "scraping":
          return "🔄 Scraping..."
        case "failed_no_html":
          return "❌ No content"
        case "failed_db_event_insert":
          return "❌ Database error"
        case "failed_exception":
          return "❌ Failed"
        case null:
        case undefined:
        case "pending":
          return "⏳ Pending"
        default:
          if (status?.startsWith("failed")) {
            return "❌ Failed"
          }
          return status || "⏳ Pending"
      }
    }

    return {
      label: getFriendlyStatus(webpage.status),
      className: webpage.status === "success" || webpage.status === "success_no_events_found" ? "bg-green-100 text-green-800" :
                webpage.status === "scraping" ? "bg-blue-100 text-blue-800" :
                webpage.status?.startsWith("failed") ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800",
      message: undefined,
      error: webpage.error_message
    }
  }

  if (webpages.length === 0) {
    return <p className="text-muted-foreground">No webpages configured yet. Add one above.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configured Webpages</CardTitle>
        <CardDescription>Manage the list of webpages to scrape for events. Status updates in real-time.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">URL</TableHead>
              <TableHead className="w-[20%]">Organization</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Scraped</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webpages.map((webpage) => {
              const progress = scrapingProgress[webpage.id]
              const displayStatus = getDisplayStatus(webpage, progress)
              
              return (
                <TableRow key={webpage.id}>
                  <TableCell className="font-medium">
                    <a
                      href={webpage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      {webpage.url.length > 50 ? `${webpage.url.substring(0, 50)}...` : webpage.url}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </TableCell>
                  <TableCell>
                    {webpage.organisation_title ? (
                      <span className="text-sm">{webpage.organisation_title}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not detected</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {webpage.event_count || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${displayStatus.className}`}
                      >
                        {displayStatus.label}
                      </span>
                      
                      {displayStatus.message && (
                        <p className="text-xs text-muted-foreground">
                          {displayStatus.message}
                        </p>
                      )}
                      
                      {displayStatus.error && (
                        <p className="text-xs text-red-600" title={displayStatus.error}>
                          {displayStatus.error.length > 50
                            ? `${displayStatus.error.substring(0, 50)}...`
                            : displayStatus.error}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {webpage.last_scraped_at
                      ? formatDistanceToNow(new Date(webpage.last_scraped_at), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <form
                        action={async () => {
                          await onAction(handleScrape(webpage.url, webpage.id))
                        }}
                      >
                        <Button 
                          type="submit" 
                          size="sm" 
                          variant="outline"
                          disabled={!!progress && progress.status !== "completed" && progress.status !== "failed"}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Scrape
                        </Button>
                      </form>
                      <form action={async () => await onAction(handleDelete(webpage.id))}>
                        <Button type="submit" size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
