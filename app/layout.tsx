import { Home, Settings } from "lucide-react"
import type { Metadata } from "next"
import { Inter, Outfit } from "next/font/google"
import Link from "next/link"
import type React from "react"
import { Toaster } from "sonner"; // Corrected import name
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "Beedee by Jolie",
  description: "Aggregate and display business development events.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${outfit.variable}`}>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-50 w-full border-b bg-background">
              <div className="container flex h-16 items-center px-6">
                <Link href="/" className="mr-10 flex items-center space-x-2">
                  <span className="font-bold sm:inline-block text-primary">Beedee</span>
                </Link>
                <nav className="flex items-center space-x-4 lg:space-x-6">
                  <Link href="/" className="text-sm font-medium transition-colors hover:text-primary flex items-center">
                    <Home className="mr-1 h-4 w-4" /> Calendar
                  </Link>
                  <Link
                    href="/configure"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
                  >
                    <Settings className="mr-1 h-4 w-4" /> Configure
                  </Link>
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            {/* Use the corrected component name */}
            <Toaster richColors closeButton theme="system" />
            <footer className="py-6 md:px-8 md:py-0 border-t">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">Built by Tom for Jolie</p>
              </div>
            </footer>
          </div>
      </body>
    </html>
  )
}
