import type { Metadata } from "next";
import { Inter, Noto_Naskh_Arabic, Playfair_Display } from "next/font/google";
import "./globals.css";
import SupressHydrationWarning from "@/components/SupressHydrationWarning";
import { QueryProvider } from "@/lib/react-query/QueryProvider";
import { baseMetadata } from "./metadata";

// ⚡ OPTIMIZATION: Use display: 'swap' for faster font rendering
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: 'swap', // Shows text immediately with fallback font
  preload: true // Preload critical font
});

const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-noto",
  display: 'swap',
  preload: false // Only load when needed (Arabic content)
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: 'swap',
  preload: false // Only load when needed (headings only)
});

export const metadata: Metadata = baseMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* Font Awesome CDN (Legacy) */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossOrigin="anonymous" referrerPolicy="no-referrer" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for faster external resource loading */}
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
      </head>
      <body
        className={`${inter.className} ${notoNaskh.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <SupressHydrationWarning />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
