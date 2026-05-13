'use client'
// components/TTSPlayer.tsx
// P058: BCP-47 codes for browser SpeechSynthesis
// P059: Text sanitization before TTS — remove URLs, bullets, special chars
//       that cause TTS to read "slash slash sunnah dot com" etc.

import { useState, useRef } from 'react'

interface TTSPlayerProps {
  text:   string
  lang:   string
  label?: string
}

// ── BCP-47 language codes for browser SpeechSynthesis ────────────────────────
const BROWSER_LANG: Record<string, string> = {
  en: 'en-US',
  uz: 'uz-UZ',  // P058: 'uz' alone not recognized — must be 'uz-UZ'
  ar: 'ar-SA',
  ru: 'ru-RU',
  tj: 'ru-RU',  // Tajik: Russian voice closest available
}

// ── P059: Sanitize text before sending to TTS ─────────────────────────────────
// Removes elements that TTS reads literally and sounds wrong:
//   URLs → removed entirely (sunnah.com/bukhari:8 → nothing)
//   Bullet chars → removed (◆ ♦ • → nothing)
//   Colons in URLs → removed but keep colons in normal sentences
//   Hash refs like #1234 → removed
//   Excessive punctuation → normalized
function sanitizeForTTS(text: string, lang: string): string {
  let s = text

  // Remove URLs completely — they sound terrible when read
  s = s.replace(/https?:\/\/[^\s,)،]+/g, '')

  // Remove bullet/diamond characters
  s = s.replace(/[◆♦•·‣▪▸►]/g, '')

  // Remove hadith reference patterns like #1234, bukhari:8
  s = s.replace(/#\d+/g, '')
  s = s.replace(/\w+:\d+/g, '')

  // Remove markdown-style bold/italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  s = s.replace(/\*([^*]+)\*/g, '$1')

  // Remove tier labels like [tier1] [tier2]
  s = s.replace(/\[tier\d\]/gi, '')

  // Normalize multiple spaces/newlines
  s = s.replace(/\n{3,}/g, '\n\n')
  s = s.replace(/[ \t]{2,}/g, ' ')

  // For TJ/UZ: spell out common numbers in words to prevent Russian number reading
  // ElevenLabs multilingual reads digits in the dominant language of surrounding text
  // This is acceptable — numbers in Cyrillic context will sound Russianish
  // No fix needed — this is ElevenLabs behavior for multilingual Cyrillic

  return s.trim()
}

// ── Voice display names ───────────────────────────────────────────────────────
const VOICE_NAMES: Record<string, string> = {
  en: 'English',
  uz: "O'zbek",
  ar: 'Arabic',
  ru: 'Русский',
  tj: 'Тоҷикӣ',
}

const LANG_FLAG: Record<string, string> = {
  en: '🇬🇧', uz: '🇺🇿', ar: '🇸🇦', ru: '🇷🇺', tj: '🇹🇯',
}

export default function TTSPlayer({ text, lang, label = 'Listen' }: TTSPlayerProps) {
  const [playing,  setPlaying]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [useEL,    setUseEL]    = useState(true)   // true = ElevenLabs, false = browser
  const [showMenu, setShowMenu] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function stop() {
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    setPlaying(false)
  }

  // P059: Always sanitize text before TTS
  const cleanText = sanitizeForTTS(text, lang)

  async function playElevenLabs() {
    setLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: cleanText.slice(0, 800), lang }),
      })
      if (!res.ok) throw new Error('ElevenLabs ' + res.status)
      const blob  = await res.blob()
      const url   = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => { setPlaying(false); playBrowser() }
    } catch {
      playBrowser()
    } finally {
      setLoading(false)
    }
  }

  function playBrowser() {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt  = new SpeechSynthesisUtterance(cleanText.slice(0, 500))
    utt.lang   = BROWSER_LANG[lang] || 'en-US'
    utt.rate   = 0.9

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices()
    const match  = voices.find(v =>
      v.lang === utt.lang ||
      v.lang.startsWith(utt.lang.split('-')[0])
    )
    if (match) utt.voice = match

    window.speechSynthesis.speak(utt)
    setPlaying(true)
    utt.onend   = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)
  }

  async function toggle() {
    if (playing) { stop(); return }
    if (useEL) {
      await playElevenLabs()
    } else {
      playBrowser()
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Play button */}
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
      >
        {loading ? <span className="animate-spin">⌛</span>
          : playing ? <span>⏸</span>
          : <span>▶</span>}
        <span>{label}</span>
      </button>

      {/* Voice selector */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>{LANG_FLAG[lang] || '🌐'}</span>
          <span>{VOICE_NAMES[lang] || lang}</span>
          <span>▾</span>
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-60 py-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide px-3 py-2 border-b border-gray-100">
              CHOOSE VOICE / RECITER
            </div>

            {/* ElevenLabs option */}
            <button
              onClick={() => { setUseEL(true); setShowMenu(false) }}
              className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-base">{LANG_FLAG[lang] || '🌐'}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {lang === 'ar' ? 'Mishary Al-Afasy' :
                   lang === 'ru' || lang === 'uz' || lang === 'tj' ? 'Abdul Rahman Al-Sudais' :
                   'ElevenLabs'}
                </div>
                <div className="text-gray-400">✦ High quality (ElevenLabs)</div>
              </div>
              {useEL && <span className="text-emerald-600">✓</span>}
            </button>

            {/* Browser option */}
            <button
              onClick={() => { setUseEL(false); setShowMenu(false) }}
              className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-base">🌐</span>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{VOICE_NAMES[lang] || lang}</div>
                <div className="text-gray-400">Standard browser voice</div>
              </div>
              {!useEL && <span className="text-emerald-600">✓</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
