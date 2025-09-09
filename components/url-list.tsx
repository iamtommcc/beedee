"use client"

import { AddEditURLSheet } from "@/components/add-edit-url-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteWebpage, getAllWebpages, getScrapingProgressToken, triggerFullInngestScrape, triggerInngestScrape } from "@/lib/form-actions"
import type { WebpageConfig } from "@/lib/types"
import { CATEGORIES } from "@/lib/types"
import { useInngestSubscription } from "@inngest/realtime/hooks"
import { formatDistanceToNow } from "date-fns"
import { CircleXIcon, ExternalLink, PlayIcon, RefreshCw } from "lucide-react"
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

async function triggerFullScrape() {
  try {
    return await triggerFullInngestScrape();
  } catch (error: unknown) {
    console.error('Failed to trigger scraping workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to initiate scraping workflow: ${errorMessage}` };
  }
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
  const [queuedScrapes, setQueuedScrapes] = useState<Set<number>>(new Set())

  // Subscribe to realtime scraping progress updates
  const { data: progressData } = useInngestSubscription({
    refreshToken: getScrapingProgressToken,
    enabled: true,
    key: "scraping-progress",
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
          // Clear queued status
          setQueuedScrapes(prev => {
            const newSet = new Set(prev)
            newSet.delete(siteId)
            return newSet
          })

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

  const refreshWebpages = async () => {
    try {
      const updatedWebpages = await getAllWebpages()
      setWebpages(updatedWebpages)
    } catch (error) {
      console.error("Failed to refresh webpage data:", error)
    }
  }

  const onAction = async (promise: Promise<{ success?: string; error?: string } | null>) => {
    const result = await promise
    if (result?.success) {
      toast.success(result.success)
      // Refresh data after any action
      await refreshWebpages()
    }
    if (result?.error) {
      toast.error(result.error)
    }
  }

  const handleScrapeClick = async (webpage: WebpageConfig) => {
    // Instantly mark as queued
    setQueuedScrapes(prev => new Set(prev).add(webpage.id))
    
    // Perform the actual scrape
    await onAction(handleScrape(webpage.url, webpage.id))
  }

  const handleScrapeAll = async () => {
    const result = await triggerFullScrape();
    if (result.success) {
      toast.success(result.success);
    }
    if (result.error) {
      toast.error(result.error);
    }
  };

  const getDisplayStatus = (webpage: WebpageConfig, progress?: ScrapingProgress, isQueued = false) => {
    // If queued, show queued status immediately
    if (isQueued && !progress) {
      return {
        label: "⏳ Queued",
        className: "bg-yellow-100 text-yellow-800",
        message: undefined,
        error: undefined
      }
    }

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
      error: webpage.status === "success_no_events_found" ? null : webpage.error_message
    }
  }

  if (webpages.length === 0) {
    return (
      <TooltipProvider>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Configured Webpages</CardTitle>
                <CardDescription>Manage the list of webpages to scrape for events. Status updates in real-time.</CardDescription>
              </div>
              <AddEditURLSheet mode="add" onSuccess={refreshWebpages} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No webpages configured yet. Add one using the button above.</p>
          </CardContent>
        </Card>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle>Configured Webpages</CardTitle>
            <CardDescription>Manage the list of webpages to scrape for events. Status updates in real-time.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleScrapeAll} variant="default">
              <PlayIcon className="h-4 w-4 mr-2" />
              Scrape All
            </Button>
            <AddEditURLSheet mode="add" onSuccess={refreshWebpages} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[35%]">Website</TableHead>
              <TableHead>Events</TableHead>
              <TableHead style={{ width: "160px", minWidth: "160px", maxWidth: "160px" }}>Status</TableHead>
              <TableHead style={{ width: "160px", minWidth: "160px", maxWidth: "160px" }}>Last Scraped</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webpages.map((webpage) => {
              const progress = scrapingProgress[webpage.id]
              const isQueued = queuedScrapes.has(webpage.id)
              const displayStatus = getDisplayStatus(webpage, progress, isQueued)
              
              return (
                <TableRow key={webpage.id}>
                  <TableCell className="font-medium py-4">
                    <div>
                      <div className="text-sm font-medium">
                          {webpage.organisation_title || new URL(webpage.url).hostname.replace("www.", "")}
                        </div>
                      <a
                        href={webpage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center text-sm"
                      >
                        {webpage.url.length > 50 ? `${webpage.url.substring(0, 50)}...` : webpage.url}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                      <div className="flex flex-wrap gap-1">
                        {webpage.categories && webpage.categories.length > 0 ? (
                          webpage.categories.slice(0, 3).map((categoryValue) => {
                            const category = CATEGORIES.find(cat => cat.value === categoryValue)
                            return (
                              <Badge key={categoryValue} variant="secondary" className="text-xs mt-1">
                                {category?.label || categoryValue}
                              </Badge>
                            )
                          })
                        ) : null}
                        {webpage.categories && webpage.categories.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{webpage.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {webpage.event_count || 0}
                    </span>
                  </TableCell>
                  <TableCell style={{ width: "160px", minWidth: "160px", maxWidth: "160px" }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium cursor-help ${displayStatus.className}`}
                        >
                          {displayStatus.label}
                        </span>
                      </TooltipTrigger>
                      {(displayStatus.message || displayStatus.error) && (
                        <TooltipContent>
                          <div className="space-y-1">
                            {displayStatus.message && (
                              <p className="text-xs">
                                {displayStatus.message}
                              </p>
                            )}
                            {displayStatus.error && (
                              <p className="text-xs text-red-400">
                                {displayStatus.error}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell style={{ width: "160px", minWidth: "160px", maxWidth: "160px" }}>
                    {webpage.last_scraped_at
                      ? formatDistanceToNow(new Date(webpage.last_scraped_at), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <AddEditURLSheet 
                        mode="edit" 
                        webpage={webpage} 
                        onSuccess={refreshWebpages} 
                      />
                      <Button 
                        onClick={async () => await handleScrapeClick(webpage)}
                        size="sm" 
                        variant="outline"
                        disabled={!!progress && progress.status !== "completed" && progress.status !== "failed"}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Scrape
                      </Button>
                      <form action={async () => await onAction(handleDelete(webpage.id))}>
                        <Button type="submit" size="sm" variant="destructive" className="w-8">
                          <CircleXIcon className="h-4 w-4" />
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
    </TooltipProvider>
  )
}
