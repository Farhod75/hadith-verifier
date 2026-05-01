import type { Metadata } from 'next'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
