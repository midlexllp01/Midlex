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
  title: 'Midlex Internship Program (MIP) | Student Lawyers & Chamber Portal',
  description: 'Official Midlex LLP Internship Management System for student lawyers, logbooks, chamber assignments, and performance evaluations.',
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
      <body className="antialiased selection:bg-amber-500 selection:text-white w-full max-w-full overflow-x-hidden min-h-screen bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
