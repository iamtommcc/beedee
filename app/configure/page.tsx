import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UrlList } from "@/components/url-list"
import { getWebpages } from "@/lib/db-queries"
import { deleteAllEvents } from "@/lib/form-actions"
import { Trash2 } from "lucide-react"

export default async function ConfigurePage() {
  const webpages = await getWebpages()

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Configure</h1>
        <p className="text-muted-foreground">Add and manage URLs for daily event scraping.</p>
      </header>

      <UrlList webpages={webpages} />

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will permanently delete data from your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteAllEvents}>
            <Button 
              type="submit" 
              variant="destructive"
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Events
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-2">
            This will permanently delete all events from the database. URLs and configurations will remain intact.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
