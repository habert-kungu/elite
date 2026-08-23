import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "./providers/providers"
import { cn } from "@workspace/ui/lib/utils";

export const metadata = {
  title: "AlphaReserve",
  description: "AlphaReserve — grow your crypto with our proven trading pool.",
}

// Deriv's house typeface: IBM Plex Sans for UI, IBM Plex Mono for numerics.
const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
