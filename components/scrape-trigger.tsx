"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayIcon } from "lucide-react"
import { toast } from "sonner"

async function triggerFullScrape() {
  try {
    // Call the server action directly
    const { triggerFullInngestScrape } = await import("@/lib/form-actions");
    return await triggerFullInngestScrape();
  } catch (error: unknown) {
    console.error('Failed to trigger scraping workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to initiate scraping workflow: ${errorMessage}` };
  }
}

export function ScrapeTrigger() {
  const handleTriggerScrape = async () => {
    const result = await triggerFullScrape();
    if (result.success) {
      toast.success(result.success);
    }
    if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraping Workflow</CardTitle>
        <CardDescription>
          Trigger the Inngest workflow to scrape all configured webpages for events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleTriggerScrape} className="w-full">
          <PlayIcon className="h-4 w-4 mr-2" />
          Start Scraping All URLs
        </Button>
      </CardContent>
    </Card>
  );
} 