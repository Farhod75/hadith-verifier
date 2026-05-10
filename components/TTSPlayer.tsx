'use client'
import { useState, useRef, useEffect } from 'react'

export const RECITERS = [
  { id: 'mishary',    name: 'Mishary Al-Afasy',              lang: 'ar', speechLang: 'ar-SA', elevenLabsId: 'fkqevZRU7Xj52dY1CTkq' as string | null, flag: '🇰🇼', quality: 'high' as const },
  { id: 'sudais',     name: 'Abdul Rahman Al-Sudais',        lang: 'ar', speechLang: 'ar-SA', elevenLabsId: 'G1QUjBCuRBbLbAmYlTgl' as string | null, flag: '🇸🇦', quality: 'high' as const },
  { id: 'minshawi',   name: 'Muhammad Siddiq Al-Minshawi',  lang: 'ar', speechLang: 'ar-SA', elevenLabsId: 'VwC51uc4PUblWEJSPzeo' as string | null, flag: '🇪🇬', quality: 'high' as const },
  { id: 'ar_standard', name: 'Arabic (Standard)',           lang: 'ar', speechLang: 'ar-SA', elevenLabsId:  null as string | null, flag: '🌍', quality: 'standard' as const },
  { id: 'en_standard', name: 'English',                     lang: 'en', speechLang: 'en-US', elevenLabsId: null as string | null, flag: '🇬🇧', quality: 'standard' as const },
  { id: 'ru_standard', name: 'Русский',                     lang: 'ru', speechLang: 'ru-RU', elevenLabsId: null as string | null, flag: '🇷🇺', quality: 'standard' as const },
  { id: 'uz_standard', name: "O'zbek",                      lang: 'uz', speechLang: 'uz-UZ', elevenLabsId: null as string | null, flag: '🇺🇿', quality: 'standard' as const },
]

type Reciter = (typeof RECITERS)[number]

interface Props {
  text: string
  lang?: string
  label?: string
}

export default function TTSPlayer({ text, lang = 'en', label }: Props) {
  const [playing, setPlaying]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError]           = useState('')
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(
    () => RECITERS.find(r => r.lang === lang) || RECITERS[4]
  )
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing) {
      const match = RECITERS.find(r => r.lang === lang)
      if (match) setSelectedReciter(match)
    }
  }, [lang])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const availableReciters = RECITERS.filter(r => r.lang === lang || r.lang === 'ar')

  function speakWithWebSpeech(reciter: Reciter) {
    if (!text || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang  = reciter.speechLang || 'en-US'
    utterance.rate  = reciter.lang === 'ar' ? 0.8 : 0.9
    utterance.pitch = 1
    utterance.onstart = () => setPlaying(true)
    utterance.onend   = () => { setPlaying(false); setLoading(false) }
    utterance.onerror = () => { setPlaying(false); setLoading(false) }
    window.speechSynthesis.speak(utterance)
    setPlaying(true)
    setLoading(false)
  }

  async function speakWithElevenLabs(voiceId: string, reciter: Reciter) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), voiceId }),
      })
      if (!res.ok) throw new Error('ElevenLabs unavailable')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setPlaying(false); setLoading(false) }
      audio.onerror = () => { setPlaying(false); setLoading(false); speakWithWebSpeech(reciter) }
      await audio.play()
      setPlaying(true)
      setLoading(false)
    } catch {
      speakWithWebSpeech(reciter)
    }
  }

  function handlePlay() {
    setError('')
    if (playing || loading) {
      window.speechSynthesis?.cancel()
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      setPlaying(false)
      setLoading(false)
      return
    }
    if (!text?.trim()) { setError('No text to read.'); return }
    if (selectedReciter.elevenLabsId) {
      speakWithElevenLabs(selectedReciter.elevenLabsId, selectedReciter)
    } else {
      speakWithWebSpeech(selectedReciter)
    }
  }

  function selectReciter(r: Reciter) {
    window.speechSynthesis?.cancel()
    if (audioRef.current) audioRef.current.pause()
    setPlaying(false)
    setLoading(false)
    setSelectedReciter(r)
    setShowPicker(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handlePlay}
          disabled={!text?.trim()}
          title={playing ? 'Stop' : label || 'Listen to this text'}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
            transition-all duration-200 select-none
            ${!text?.trim() ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' : ''}
            ${playing  ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''}
            ${loading  ? 'bg-gray-50 border-gray-200 text-gray-500' : ''}
            ${!playing && !loading && text?.trim() ? 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300' : ''}
          `}
        >
          {loading
            ? <span className="w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
            : <span className="text-sm leading-none">{playing ? '⏸' : '▶'}</span>
          }
          <span>{loading ? 'Loading…' : playing ? 'Pause' : label || 'Listen'}</span>
        </button>

        {/* Reciter picker */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>{selectedReciter.flag}</span>
            <span className="max-w-28 truncate">{selectedReciter.name}</span>
            <span className="text-gray-400">▾</span>
          </button>

          {showPicker && (
            <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-64 overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100 font-medium uppercase tracking-wide">
                Choose voice / reciter
              </div>
              {availableReciters.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectReciter(r)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left
                    transition-colors hover:bg-gray-50
                    ${selectedReciter.id === r.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'}
                    ${r.id === 'ar_standard' || r.lang !== 'ar' ? 'border-t border-gray-100' : ''}
                  `}
                >
                  <span className="text-base">{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    {r.elevenLabsId
                      ? <p className="text-xs text-emerald-600">✦ High quality (ElevenLabs)</p>
                      : <p className="text-xs text-gray-400">Standard browser voice</p>
                    }
                  </div>
                  {selectedReciter.id === r.id && (
                    <span className="text-emerald-600 flex-shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}