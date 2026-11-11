'use client'
// components/InstallButton.tsx
// P396: "Install app" - shown only when the browser offers installation
// (Chrome/Edge/Samsung on Android and desktop fire beforeinstallprompt). Once
// installed, HV appears in Android's Share menu (app/manifest.ts share_target).
// iPhone Safari never fires the event, so nothing is shown there.

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

export default function InstallButton({ label }: { label: string }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const offer = (e: Event) => { e.preventDefault(); setPromptEvent(e as InstallPromptEvent) }
    const installed = () => setPromptEvent(null)
    window.addEventListener('beforeinstallprompt', offer)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', offer)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!promptEvent) return null
  return (
    <div className="max-w-3xl mx-auto mt-3">
      <button
        data-testid="install-app"
        onClick={async () => {
          await promptEvent.prompt()
          await promptEvent.userChoice.catch(() => undefined)
          setPromptEvent(null)
        }}
        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      >
        📲 {label}
      </button>
    </div>
  )
}
