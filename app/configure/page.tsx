import { AddUrlForm } from "@/components/add-url-form"
import { UrlList } from "@/components/url-list"
import { getWebpages } from "@/lib/db-queries"
import { Separator } from "@/components/ui/separator"

export default async function ConfigurePage() {
  const webpages = await getWebpages()

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configure Webpages</h1>
        <p className="text-muted-foreground">Add and manage URLs for daily event scraping.</p>
      </header>

      <AddUrlForm />

      <Separator />

      <UrlList webpages={webpages} />
    </div>
  )
}

// Add default export for Next.js
export const getConfig = () => ({})
