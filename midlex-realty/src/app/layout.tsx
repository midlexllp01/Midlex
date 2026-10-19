import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/midlex-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/midlex-logo.png",
  },
  title: 'Midlex Realty | Verified Property Sales, Management & Real Estate Conveyancing',
  description: 'Midlex Realty is the premier real estate and property management arm of Midlex Law Firm. Verified land sales, facility management, title search, C of O verification, and conveyancing.',
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
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
