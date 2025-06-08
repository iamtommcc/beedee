import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  console.log("[Inngest Trigger] Initiating scraping workflow");

  try {
    const result = await inngest.send({
      name: "crawl/sites.requested",
      data: { urls: [] }, // URLs will be fetched from DB in the planner function
    });

    console.log("[Inngest Trigger] Successfully triggered scraping workflow", result);
    return NextResponse.json({ 
      message: "Scraping workflow initiated successfully",
      eventId: result.ids[0]
    });
  } catch (error: unknown) {
    console.error("[Inngest Trigger] Error triggering scraping workflow:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to initiate scraping workflow: ${errorMessage}` },
      { status: 500 }
    );
  }
} 