import type { Metadata } from 'next'
import './globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata: Metadata = {
  title: 'Hadith Verifier — Detect fabricated hadiths on social media',
  description: 'AI-powered tool to verify hadiths shared on Facebook, Instagram, and WhatsApp. Multi-language: English, Uzbek, Arabic, Russian.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children} <GoogleAnalytics gaId="G-32J9GLEBKS" /></body>
    </html>
  )
}
