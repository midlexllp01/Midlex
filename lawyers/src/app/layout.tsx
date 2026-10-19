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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/midlex-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/midlex-logo.png",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://lawyer-midlex-llp-lawfirm.vercel.app"),
  title: {
    default: "Lawyers Login | Midlex LLP",
    template: "%s | Midlex LLP Lawyers"
  },
  description: "Midlex LLP Lawyer Workspace Portal",
  keywords: ["Midlex LLP Lawyers", "Lawyer Portal", "Attorney Portal", "Midlex Legal"],
  authors: [{ name: "Midlex LLP" }],
  creator: "Midlex LLP",
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
