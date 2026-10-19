import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AuthProvider } from "@/context/AuthContext";
import PageTransition from "@/components/PageTransition";
import BackendWarmup from "@/components/BackendWarmup";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://midlex.com"),
  title: {
    default: "Midlex LLP | Premium Law Firm in Nigeria",
    template: "%s | Midlex LLP"
  },
  description: "Midlex LLP is a premier Nigerian law firm specializing in Real Estate, Corporate Law, and Litigation. Headquartered in Benin City.",
  keywords: ["Law Firm Nigeria", "Benin City Lawyer", "Property Law Nigeria", "Real Estate Attorney", "Midlex LLP", "Legal Services Edo State"],
  authors: [{ name: "Midlex LLP" }],
  creator: "Midlex LLP",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://midlex.com",
    siteName: "Midlex LLP",
    title: "Midlex LLP | Premium Legal Services",
    description: "Sophisticated legal solutions for complex challenges. Leading law firm in Benin City, Nigeria.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Midlex LLP Legal Excellence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Midlex LLP | Premium Legal Services",
    description: "Strategic legal advisory and excellence in litigation. Headquartered in Benin City.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased light w-full max-w-full overflow-x-hidden`}
      style={{ colorScheme: "light" }}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/midlex-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/midlex-logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 w-full max-w-full overflow-x-hidden relative" style={{ colorScheme: "light" }} suppressHydrationWarning>
        <AuthProvider>
          <BackendWarmup />
          <PageTransition>
            {children}
          </PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
