import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clubhaus AI',
  description: 'Your personal AI assistant for all things Clubhaus',
  keywords: ['AI', 'Clubhaus', 'Assistant', 'Chat', 'Agency'],
  authors: [{ name: 'Clubhaus Agency' }],
  metadataBase: new URL('https://clubhaus-ai.vercel.app'),
  openGraph: {
    title: 'Clubhaus AI',
    description: 'Your personal AI assistant for all things Clubhaus',
    url: 'https://clubhaus-ai.vercel.app',
    siteName: 'Clubhaus AI',
    images: [
      {
        url: '/gifs/Small-Transparent-messeger-app-Chip.gif',
        width: 1200,
        height: 630,
        alt: 'Clubhaus AI Assistant',
        type: 'image/gif',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clubhaus AI',
    description: 'Your personal AI assistant for all things Clubhaus',
    images: ['/gifs/Small-Transparent-messeger-app-Chip.gif'],
    creator: '@clubhaus',
    site: '@clubhaus',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  )
} 