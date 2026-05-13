// components/TTSPlayer.tsx
// P058: Browser SpeechSynthesis requires BCP-47 codes (uz-UZ not uz)
// P058: Added TJ language support (tj → ru-RU fallback for browser TTS)
// ElevenLabs: uz and tj both use Abrar Sabbah voice (Russian/multilingual)

'use client'

import { useState, useRef } from 'react'

interface TTSPlayerProps {
  text:   string
  lang:   string   // 'en' | 'uz' | 'ar' | 'ru' | 'tj'
  label?: string
}

// ── BCP-47 language codes for browser SpeechSynthesis ────────────────────────
// P058: 'uz' alone is not recognized — must be 'uz-UZ'
// TJ has no native TTS voice — falls back to ru-RU
const BROWSER_LANG_CODE: Record<string, string> = {
  en: 'en-US',
  uz: 'uz-UZ',   // ← was missing, caused Latin reading of Cyrillic text
  ar: 'ar-SA',
  ru: 'ru-RU',
  tj: 'ru-RU',   // Tajik fallback to Russian voice (closest available)
}

// ── ElevenLabs voice IDs (from env vars) ─────────────────────────────────────
// AR  → Hijazi or Abu Salem
// RU/UZ/TJ → Abrar Sabbah (multilingual)
// EN  → default ElevenLabs voice

export default function TTSPlayer({ text, lang, label = 'Listen' }: TTSPlayerProps) {
  const [playing,  setPlaying]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [voice,    setVoice]    = useState<string>('elevenlabs')
  const [showMenu, setShowMenu] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Stop any current playback ──────────────────────────────────────────────
  function stop() {
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }

  // ── ElevenLabs TTS ────────────────────────────────────────────────────────
  async function playElevenLabs() {
    setLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 800), lang }),
      })
      if (!res.ok) throw new Error('ElevenLabs TTS failed: ' + res.status)
      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => {
        setPlaying(false)
        playBrowser() // fallback to browser TTS on audio error
      }
    } catch (e) {
      console.warn('ElevenLabs TTS failed, falling back to browser TTS:', e)
      playBrowser()
    } finally {
      setLoading(false)
    }
  }

  // ── Browser SpeechSynthesis ───────────────────────────────────────────────
  // P058: Use BCP-47 code from map — 'uz-UZ' not 'uz'
  function playBrowser() {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt  = new SpeechSynthesisUtterance(text.slice(0, 500))
    utt.lang   = BROWSER_LANG_CODE[lang] || 'en-US'
    utt.rate   = 0.9
    utt.pitch  = 1.0

    // Try to find a matching voice for the language
    const voices = window.speechSynthesis.getVoices()
    const match  = voices.find(v =>
      v.lang.startsWith(utt.lang.split('-')[0]) ||
      v.lang === utt.lang
    )
    if (match) utt.voice = match

    window.speechSynthesis.speak(utt)
    setPlaying(true)
    utt.onend   = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)
  }

  // ── Toggle play/stop ──────────────────────────────────────────────────────
  async function toggle() {
    if (playing) { stop(); return }
    if (voice === 'browser') { playBrowser(); return }
    await playElevenLabs()
  }

  // ── Voice label ───────────────────────────────────────────────────────────
  const voiceOptions = [
    { id: 'elevenlabs', label: 'High quality (ElevenLabs)' },
    { id: 'browser',    label: `${lang === 'uz' ? 'O\'zbek' : lang === 'tj' ? 'Тоҷикӣ' : lang === 'ar' ? 'Arabic' : lang === 'ru' ? 'Русский' : 'English'} (Standard browser voice)` },
  ]

  const langFlag: Record<string, string> = {
    en: '🇬🇧', uz: '🇺🇿', ar: '🇸🇦', ru: '🇷🇺', tj: '🇹🇯',
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Play/stop button */}
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="animate-spin">⌛</span>
        ) : playing ? (
          <span>⏸</span>
        ) : (
          <span>▶</span>
        )}
        <span>{label}</span>
      </button>

      {/* Voice/reciter selector */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>{langFlag[lang] || '🌐'}</span>
          <span>{lang === 'uz' ? "O'zbek" : lang === 'tj' ? 'Тоҷикӣ' : lang === 'ar' ? 'Arabic' : lang === 'ru' ? 'Русский' : 'English'}</span>
          <span>▾</span>
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-56 py-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide px-3 py-2 border-b border-gray-100">
              Choose voice / reciter
            </div>
            {voiceOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setVoice(opt.id); setShowMenu(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="text-base">{opt.id === 'elevenlabs' ? langFlag[lang] || '🌐' : '🌐'}</span>
                <div>
                  <div className="font-medium text-gray-800">{opt.id === 'elevenlabs' ? (
                    lang === 'ar' ? 'Mishary Al-Afasy' :
                    lang === 'ru' || lang === 'uz' || lang === 'tj' ? 'Abdul Rahman Al-Sudais' :
                    'ElevenLabs'
                  ) : langFlag[lang]}</div>
                  <div className="text-gray-400">{opt.label}</div>
                </div>
                {voice === opt.id && <span className="ml-auto text-emerald-600">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
