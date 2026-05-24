import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Allo Inventory — Reserve Products Instantly',
  description:
    'Multi-warehouse inventory reservation platform. Reserve products from Mumbai or Delhi warehouses with real-time stock visibility and secure checkout.',
  keywords: 'inventory, reservation, warehouse, products, checkout',
  openGraph: {
    title: 'Allo Inventory — Reserve Products Instantly',
    description: 'Real-time inventory reservation across multiple warehouses',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-warm-bg">
        <Navbar />
        <main>{children}</main>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </body>
    </html>
  )
}
