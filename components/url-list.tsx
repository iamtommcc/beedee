"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteWebpage } from "@/lib/form-actions"
import { scrapeUrlAndStoreEvents } from "@/lib/scraper"
import type { WebpageConfig } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

async function handleDelete(id: number) {
  if (confirm("Are you sure you want to delete this URL? This will also delete associated events.")) {
    return deleteWebpage(id)
  }
  return null
}

async function handleScrape(url: string, id: number) {
  const result = await scrapeUrlAndStoreEvents(url, id)
  if (result && result.error) {
    return { error: result.error }
  }
  return { success: "Scrape initiated successfully" }
}

export function UrlList({ webpages }: { webpages: WebpageConfig[] }) {
  const onAction = async (promise: Promise<{ success?: string; error?: string } | null>) => {
    const result = await promise
    if (result?.success) {
      toast.success(result.success)
    }
    if (result?.error) {
      toast.error(result.error)
    }
  }

  if (webpages.length === 0) {
    return <p className="text-muted-foreground">No webpages configured yet. Add one above.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configured Webpages</CardTitle>
        <CardDescription>Manage the list of webpages to scrape for events.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">URL</TableHead>
              <TableHead className="w-[20%]">Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Scraped</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webpages.map((webpage) => (
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
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      webpage.status === "success"
                        ? "bg-green-100 text-green-800"
                        : webpage.status === "scraping"
                          ? "bg-blue-100 text-blue-800"
                          : webpage.status?.startsWith("failed")
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {webpage.status || "pending"}
                  </span>
                  {webpage.error_message && (
                    <p className="text-xs text-red-600 mt-1" title={webpage.error_message}>
                      {webpage.error_message.length > 50
                        ? `${webpage.error_message.substring(0, 50)}...`
                        : webpage.error_message}
                    </p>
                  )}
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
                      <Button type="submit" size="sm" variant="outline">
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
