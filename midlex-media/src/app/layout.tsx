import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/midlex-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/midlex-logo.png",
  },
  title: 'Midlex Media | Legal Content Creation, Social Media & Live Streaming',
  description: 'Midlex Media is the premier legal media agency specializing in law content creation, live streaming for legal events, podcasts, and digital PR. Headed by Daniel Uyi.',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="w-full max-w-full overflow-x-hidden">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/midlex-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/midlex-logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-amber-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
