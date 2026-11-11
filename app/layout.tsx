import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hadith Verifier — Detect fabricated hadiths on social media',
  description:
    'Free AI tool to verify hadiths and duas before sharing on Facebook, Instagram, or WhatsApp. Supports Arabic, Uzbek, Russian, English, and Tajik. Built as sadaqah jariyah.',
  metadataBase: new URL('https://hadithverifier.com'),

  openGraph: {
    title: 'Hadith Verifier — Detect fabricated hadiths',
    description:
      'Free AI tool to verify hadiths before sharing on social media. Supports EN · UZ · AR · RU · TJ. No ads. No cost. Sadaqah jariyah.',
    url: 'https://hadithverifier.com',
    siteName: 'Hadith Verifier',
    images: [
      {
        url: 'https://hadithverifier.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hadith Verifier — AI-powered hadith authentication tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Hadith Verifier — Detect fabricated hadiths',
    description: 'Free AI tool to verify hadiths before sharing. Supports EN · UZ · AR · RU · TJ.',
    images: ['https://hadithverifier.com/og-image.png'],
  },

  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  // P396: installable, and once installed it appears in Android's Share menu (share_target)
  manifest: '/manifest.webmanifest',

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: {
    canonical: 'https://hadithverifier.com',
  },

  keywords: [
    'hadith verifier',
    'fabricated hadith',
    'fake hadith checker',
    'Islamic hadith authentication',
    'hadith checker',
    'хадис проверка',
    'hadis tekshirish',
    'التحقق من الحديث',
  ],
}

export const viewport: Viewport = { themeColor: '#047857' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // P383: browser extensions (Katalon, Tosca, password managers) write attributes
  // onto <html>/<body> before React hydrates. suppressHydrationWarning silences
  // only these two elements' own attributes - the app tree is still checked.
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {/* GA4 - removed by accident in dc67176 (2026-05-01), restored 2026-11-08 */}
        <GoogleAnalytics gaId="G-32J9GLEBKS" />
      </body>
    </html>
  )
}
