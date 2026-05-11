'use client'
import { useState, useRef, useEffect } from 'react'

const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  uz: 'ru-RU',   // Uzbek not supported by Web Speech API — Russian model closest
  ru: 'ru-RU',
  tj: 'ru-RU',   // Tajik not supported — Russian model closest
}

interface Props {
  onTranscript: (text: string) => void
  lang?: string
  disabled?: boolean
}

export default function SpeechInput({ onTranscript, lang = 'en', disabled = false }: Props) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    setSupported(isSupported)
  }, [])

  useEffect(() => {
    if (listening) stopListening()
  }, [lang])

  function startListening() {
    if (!supported || disabled) return
    setError('')

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = SPEECH_LANG_MAP[lang] || 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setListening(true)
      setInterimText('')
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      setInterimText(interim)
      if (final) {
        onTranscript(final)
        setInterimText('')
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterimText('')
    }

    recognition.onerror = (event: any) => {
      setListening(false)
      setInterimText('')
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic access in your browser.')
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try again.')
      } else if (event.error === 'network') {
        setError('Network error. Check your connection.')
      } else {
        setError(`Speech error: ${event.error}`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
    setInterimText('')
  }

  if (!supported) return null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          title={listening ? 'Stop recording' : `Speak in ${lang.toUpperCase()} — click to start`}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
            transition-all duration-200 select-none
            ${disabled ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' : ''}
            ${listening
              ? 'bg-red-50 border-red-300 text-red-700 shadow-sm shadow-red-100'
              : !disabled
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
              : ''}
          `}
        >
          <span className="relative flex items-center">
            {listening ? (
              <>
                <span className="absolute -inset-1 rounded-full bg-red-400 opacity-20 animate-ping" />
                <span className="text-base leading-none">⏹</span>
              </>
            ) : (
              <span className="text-base leading-none">🎙</span>
            )}
          </span>
          <span>{listening ? 'Stop' : 'Speak'}</span>
          {listening && (
            <span className="flex gap-0.5 items-end h-3">
              <span className="w-0.5 bg-red-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '100ms' }} />
              <span className="w-0.5 bg-red-500 rounded-full animate-bounce h-2" style={{ animationDelay: '200ms' }} />
            </span>
          )}
        </button>

        {interimText && (
          <span className="text-xs text-gray-400 italic truncate max-w-48">
            "{interimText}…"
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  )
}