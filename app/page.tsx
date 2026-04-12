'use client'

import { useState, useRef, useEffect } from 'react'

type Lang = 'en' | 'uz' | 'ar' | 'ru'
type Tab = 'analyze' | 'dua' | 'sources' | 'admin'
type Verdict = 'fabricated' | 'weak' | 'authentic' | 'unclear' | 'no_hadith'

interface Reference {
  source: string
  description: string
  url: string
  authority: string
}

interface AnalysisResult {
  extracted_text?: string
  verdict: Verdict
  confidence: string
  claim_summary: string
  red_flags: string[]
  analysis: string
  authentic_alternative: string
  references: Reference[]
  suggested_comment: string
}

interface DuaResult {
  extracted_text?: string
  dua_identified: string
  status: 'correct' | 'has_errors' | 'unknown_dua'
  errors_found: string[]
  corrected_arabic: string
  transliterations: {
    latin_uz: string
    cyrillic_uz: string
    cyrillic_ru: string
    english: string
  }
  translation: {
    uz: string
    ru: string
    en: string
  }
  source: {
    name: string
    reference: string
    url: string
    grade: string
  }
  suggested_comment: {
    uz_latin: string
    uz_cyrillic: string
    ru: string
    en: string
  }
}

interface QueueItem {
  id: string
  post_text: string
  verdict: string
  claim_summary: string
  suggested_comment: string
  lang: string
  created_at: string
}

const EXAMPLES = {
  uz: `Мусулмонлар диққат билан эшитинг\nРасул (с.а.в) айтдилар:\n1. Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа қилган савоби ёзилади.\n2. Ким ухлашдан олдин 3 марта Сура Ихлос ўқиса, бир марта Қуръонни хатм қилган савобини олади.\nБу видеони улашиб, бошқаларга ҳам билиш имконини яратиб беринг.`,
  chain: `URGENT SHARE: Prophet ﷺ said whoever reads this dua 7 times and shares with 10 people tonight, Allah will forgive all their sins. Don't break the chain! 🕌`,
  authentic: `The Messenger of Allah ﷺ said: "Whoever prays Fajr and Asr will enter Paradise." — Sahih al-Bukhari 574`
}

const DUA_EXAMPLES = {
  wrong: `اللهم أغنني بفضلك عمّن سواك و بحَلَالَك عن حَرَامِك\nАллагьумма агънини би фадлика 'амман сивак ва би хIалалика 'ан хIарамик`,
  arabic_only: `رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ`,
  transliteration: `Subhanakallahumma wa bihamdika wa tabarakasmuka wa ta'ala jadduka wa la ilaha ghairuk`,
}

const VERDICT_CONFIG = {
  fabricated: { label: 'Fabricated hadith', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
  weak: { label: 'Weak / unverified', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  authentic: { label: 'Authentic', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  unclear: { label: 'Needs verification', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
  no_hadith: { label: 'No hadith found', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
}

const TIER_CONFIG = {
  tier1: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800' },
  tier2: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-800' },
  tier3: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800' },
}

function CopyButton({ text, label = 'Copy' }: { text: string, label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
      {copied ? 'Copied!' : label}
    </button>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [lang, setLang] = useState<Lang>('en')
  const [postText, setPostText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [duaText, setDuaText] = useState('')
  const [duaImage, setDuaImage] = useState<File | null>(null)
  const [duaImagePreview, setDuaImagePreview] = useState<string>('')
  const [duaLoading, setDuaLoading] = useState(false)
  const [duaResult, setDuaResult] = useState<DuaResult | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, fabricated: 0, authentic: 0 })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const duaFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (tab === 'admin') fetchQueue() }, [tab])

  async function fetchQueue() {
    setQueueLoading(true)
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
    } catch { setQueue([]) }
    setQueueLoading(false)
  }

  function handleImageSelect(file: File, isDua = false) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      if (isDua) { setDuaImage(file); setDuaImagePreview(e.target?.result as string) }
      else { setImage(file); setImagePreview(e.target?.result as string); setPostText('') }
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!postText.trim() && !image) return
    setLoading(true); setResult(null)
    try {
      let res
      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        formData.append('lang', lang)
        if (postText.trim()) formData.append('postText', postText)
        res = await fetch('/api/analyze', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postText, lang }) })
      }
      const data = await res.json()
      if (data.error) { alert('Error: ' + data.error); return }
      setResult(data)
      setStats(prev => ({ total: prev.total + 1, fabricated: prev.fabricated + (data.verdict === 'fabricated' || data.verdict === 'weak' ? 1 : 0), authentic: prev.authentic + (data.verdict === 'authentic' ? 1 : 0) }))
    } catch { alert('Analysis failed.') }
    setLoading(false)
  }

  async function analyzeDua() {
    if (!duaText.trim() && !duaImage) return
    setDuaLoading(true); setDuaResult(null)
    try {
      let res
      if (duaImage) {
        const formData = new FormData()
        formData.append('image', duaImage)
        if (duaText.trim()) formData.append('duaText', duaText)
        res = await fetch('/api/dua', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/dua', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duaText }) })
      }
      const data = await res.json()
      if (data.error) { alert('Error: ' + data.error); return }
      setDuaResult(data)
    } catch { alert('Analysis failed.') }
    setDuaLoading(false)
  }

  async function dismissFromQueue(id: string) {
    await fetch('/api/queue', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setQueue(q => q.filter(i => i.id !== id))
  }

  const vc = result ? VERDICT_CONFIG[result.verdict] : null

  const duaStatusConfig = {
    correct: { label: 'Correct dua', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
    has_errors: { label: 'Errors found', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
    unknown_dua: { label: 'Unknown dua', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-lg">☽</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Hadith Verifier</h1>
            <p className="text-xs text-gray-500">Hadith authentication · Dua corrector · EN · UZ · AR · RU</p>
          </div>
          <div className="ml-auto flex gap-4 text-center">
            <div><div className="text-lg font-semibold text-gray-900">{stats.total}</div><div className="text-xs text-gray-500">Checked</div></div>
            <div><div className="text-lg font-semibold text-red-700">{stats.fabricated}</div><div className="text-xs text-gray-500">Flagged</div></div>
            <div><div className="text-lg font-semibold text-green-700">{stats.authentic}</div><div className="text-xs text-gray-500">Authentic</div></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {(['analyze', 'dua', 'sources', 'admin'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'border-emerald-600 text-emerald-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'admin' ? `Admin queue${queue.length ? ` (${queue.length})` : ''}` : t === 'dua' ? 'Dua corrector' : t === 'analyze' ? 'Analyze post' : 'Sources'}
            </button>
          ))}
        </div>

        {/* ANALYZE TAB */}
        {tab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setImage(null); setImagePreview('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Paste text
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Upload screenshot
                </button>
              </div>

              {!imagePreview ? (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Paste post content</div>
                  <textarea value={postText} onChange={e => setPostText(e.target.value)}
                    placeholder="Paste Facebook, Instagram, or WhatsApp post text — any language (Uzbek, Arabic, Russian, English...)"
                    className="w-full min-h-28 text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-emerald-500 bg-gray-50" />
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleImageSelect(e.dataTransfer.files[0]) }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-2 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-xs text-gray-400">Or drag & drop a screenshot · Click to browse</div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="text-xs text-gray-400">Try:</span>
                    {Object.entries({ 'Fabricated (Uzbek)': 'uz', 'Chain message': 'chain', 'Authentic': 'authentic' }).map(([label, key]) => (
                      <button key={key} onClick={() => setPostText(EXAMPLES[key as keyof typeof EXAMPLES])}
                        className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{label}</button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="relative">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Screenshot — Claude Vision will read it</div>
                  <img src={imagePreview} alt="Screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                  <button onClick={() => { setImage(null); setImagePreview('') }}
                    className="absolute top-6 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded hover:bg-red-200">Remove</button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }} />

              <div className="flex gap-2 mt-3 items-center flex-wrap">
                <button onClick={analyze} disabled={loading || (!postText.trim() && !image)}
                  className="bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                  {loading ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{image ? 'Reading...' : 'Analyzing...'}</> : image ? 'Analyze screenshot' : 'Analyze post'}
                </button>
                <button onClick={() => { setPostText(''); setResult(null); setImage(null); setImagePreview('') }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Clear</button>
                <div className="ml-auto flex gap-1 items-center">
                  <span className="text-xs text-gray-400 mr-1">Reply in:</span>
                  {(['en', 'uz', 'ar', 'ru'] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${lang === l ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-gray-200 text-gray-500'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {result && vc && (
              <div className="space-y-3">
                {result.extracted_text && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Text extracted from screenshot</div>
                    <div className="text-sm text-blue-800 leading-relaxed">{result.extracted_text}</div>
                  </div>
                )}
                <div className={`rounded-xl border p-4 ${vc.bg} ${vc.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${vc.badge}`}>{vc.label}</span>
                    <span className="text-xs text-gray-500">{result.confidence} confidence</span>
                  </div>
                  <div className={`font-medium mb-2 ${vc.text}`}>{result.claim_summary}</div>
                  <div className={`text-sm leading-relaxed ${vc.text}`}>{result.analysis}</div>
                  {result.red_flags?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">Red flags</div>
                      {result.red_flags.map((f, i) => <div key={i} className="flex gap-2 text-xs mb-1"><span>◆</span><span>{f}</span></div>)}
                    </div>
                  )}
                </div>
                {result.authentic_alternative && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Authentic scholarship says</div>
                    <div className="text-sm leading-relaxed text-gray-700 mb-3">{result.authentic_alternative}</div>
                    {result.references?.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Verified sources</div>
                        {result.references.map((ref, i) => {
                          const tc = TIER_CONFIG[ref.authority as keyof typeof TIER_CONFIG] || TIER_CONFIG.tier3
                          return (
                            <div key={i} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tc.dot}`} />
                              <div>
                                <span className="text-xs font-medium">{ref.source}</span>
                                <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${tc.badge}`}>{ref.authority}</span>
                                <div className="text-xs text-gray-500 mt-0.5">{ref.description}</div>
                                {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline break-all">{ref.url}</a>}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
                {result.suggested_comment && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Ready-to-post comment ({lang.toUpperCase()})</div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{result.suggested_comment}</div>
                    <div className="flex gap-2 mt-3">
                      <CopyButton text={result.suggested_comment} label="Copy comment" />
                      {(result.verdict === 'fabricated' || result.verdict === 'weak') && (
                        <button onClick={() => setTab('admin')} className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                          View in admin queue →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DUA CORRECTOR TAB */}
        {tab === 'dua' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dua corrector</div>
              <div className="text-xs text-gray-400 mb-3">Checks Arabic word order, diacritics, and transliteration errors. Provides correct text in 4 scripts.</div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => { setDuaImage(null); setDuaImagePreview('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!duaImagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Paste text
                </button>
                <button onClick={() => duaFileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${duaImagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Upload screenshot
                </button>
              </div>

              {!duaImagePreview ? (
                <>
                  <textarea value={duaText} onChange={e => setDuaText(e.target.value)}
                    placeholder="Paste Arabic dua text, transliteration, or both — any script (Arabic, Cyrillic, Latin)..."
                    className="w-full min-h-28 text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-emerald-500 bg-gray-50" />
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="text-xs text-gray-400">Try:</span>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.wrong)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">Wrong order (like Reel)</button>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.arabic_only)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">Arabic only</button>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.transliteration)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">Transliteration</button>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <img src={duaImagePreview} alt="Screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                  <button onClick={() => { setDuaImage(null); setDuaImagePreview('') }}
                    className="absolute top-2 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Remove</button>
                </div>
              )}

              <input ref={duaFileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], true) }} />

              <div className="flex gap-2 mt-3">
                <button onClick={analyzeDua} disabled={duaLoading || (!duaText.trim() && !duaImage)}
                  className="bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-40 flex items-center gap-2">
                  {duaLoading ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Checking...</> : 'Check dua'}
                </button>
                <button onClick={() => { setDuaText(''); setDuaResult(null); setDuaImage(null); setDuaImagePreview('') }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Clear</button>
              </div>
            </div>

            {/* Dua Result */}
            {duaResult && (() => {
              const sc = duaStatusConfig[duaResult.status]
              return (
                <div className="space-y-3">
                  {duaResult.extracted_text && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Extracted from screenshot</div>
                      <div className="text-sm text-blue-800">{duaResult.extracted_text}</div>
                    </div>
                  )}

                  {/* Status */}
                  <div className={`rounded-xl border p-4 ${sc.bg} ${sc.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc.badge}`}>{sc.label}</span>
                      {duaResult.dua_identified && <span className="text-xs text-gray-500">{duaResult.dua_identified}</span>}
                    </div>
                    {duaResult.errors_found?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">Errors found</div>
                        {duaResult.errors_found.map((e, i) => (
                          <div key={i} className="flex gap-2 text-xs mb-1"><span>◆</span><span>{e}</span></div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Corrected Arabic */}
                  {duaResult.corrected_arabic && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Corrected Arabic with diacritics</div>
                      <div className="text-2xl text-right leading-relaxed text-gray-900 font-arabic p-3 bg-gray-50 rounded-lg" dir="rtl">
                        {duaResult.corrected_arabic}
                      </div>
                      <div className="mt-2 flex justify-end">
                        <CopyButton text={duaResult.corrected_arabic} label="Copy Arabic" />
                      </div>
                      {duaResult.source?.url && (
                        <div className="mt-3 text-xs text-gray-500">
                          Source: <a href={duaResult.source.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                            {duaResult.source.name} — {duaResult.source.reference}
                          </a>
                          {duaResult.source.grade && <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{duaResult.source.grade}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transliterations */}
                  {duaResult.transliterations && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Transliterations — 4 scripts</div>
                      <div className="space-y-3">
                        {[
                          { key: 'latin_uz', label: 'Uzbek Latin', flag: '🇺🇿', desc: 'For younger Uzbek speakers' },
                          { key: 'cyrillic_uz', label: 'Uzbek Cyrillic', flag: '🇺🇿', desc: 'For older Uzbek speakers (50+)' },
                          { key: 'cyrillic_ru', label: 'Russian Cyrillic', flag: '🇷🇺', desc: 'For Russian-speaking Muslims' },
                          { key: 'english', label: 'English', flag: '🇬🇧', desc: 'For English speakers' },
                        ].map(({ key, label, flag, desc }) => {
                          const text = duaResult.transliterations[key as keyof typeof duaResult.transliterations]
                          if (!text) return null
                          return (
                            <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="text-xs font-medium text-gray-700">{flag} {label}</span>
                                  <span className="text-xs text-gray-400 ml-2">{desc}</span>
                                </div>
                                <CopyButton text={text} />
                              </div>
                              <div className="text-sm text-gray-800 leading-relaxed">{text}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Translation */}
                  {duaResult.translation && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Meaning / Translation</div>
                      <div className="space-y-2">
                        {[
                          { key: 'uz', label: '🇺🇿 Uzbek' },
                          { key: 'ru', label: '🇷🇺 Russian' },
                          { key: 'en', label: '🇬🇧 English' },
                        ].map(({ key, label }) => {
                          const text = duaResult.translation[key as keyof typeof duaResult.translation]
                          if (!text) return null
                          return (
                            <div key={key} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">{label}</span>
                              <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ready-to-post corrections */}
                  {duaResult.suggested_comment && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Ready-to-post correction comments</div>
                      <div className="space-y-3">
                        {[
                          { key: 'uz_latin', label: '🇺🇿 Uzbek Latin' },
                          { key: 'uz_cyrillic', label: '🇺🇿 Uzbek Cyrillic (older generation)' },
                          { key: 'ru', label: '🇷🇺 Russian' },
                          { key: 'en', label: '🇬🇧 English' },
                        ].map(({ key, label }) => {
                          const text = duaResult.suggested_comment[key as keyof typeof duaResult.suggested_comment]
                          if (!text) return null
                          return (
                            <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">{label}</span>
                                <CopyButton text={text} />
                              </div>
                              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* SOURCES TAB */}
        {tab === 'sources' && (
          <div className="space-y-4">
            {[
              { tier: 'Tier 1 — Primary collections', sources: [
                { name: 'Dorar.net', desc: '520,000+ hadiths, narrator biographies, JSON API.', url: 'https://dorar.net' },
                { name: 'Sunnah.com', desc: 'Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Muwatta, Ahmad, Darimi.', url: 'https://sunnah.com' },
                { name: 'HadeethEnc.com', desc: 'Authenticated hadiths with explanations. Free API. Uzbek included.', url: 'https://hadeethenc.com' },
              ]},
              { tier: 'Tier 2 — Scholarly bodies', sources: [
                { name: 'IslamQA.info', desc: 'Sheikh Saleh Al-Munajjid. 200,000+ fatwas.', url: 'https://islamqa.info' },
                { name: 'IslamWeb.net', desc: 'Full takhrij: sanad, matn, narrator biography.', url: 'https://islamweb.net' },
                { name: 'Yaqeen Institute', desc: 'Peer-reviewed Islamic scholarship in English.', url: 'https://yaqeeninstitute.org' },
                { name: 'Islamhouse.com', desc: 'Uzbek, Russian, Arabic, 100+ languages.', url: 'https://islamhouse.com' },
              ]},
              { tier: 'Tier 3 — Supporting', sources: [
                { name: 'HadithAPI.com', desc: 'Free REST API. Major collections.', url: 'https://hadithapi.com' },
                { name: 'AboutIslam.net', desc: 'Scholar Q&A on authenticity.', url: 'https://aboutislam.net' },
                { name: 'AlSunnah.com', desc: 'Full Kutub al-Sittah searchable.', url: 'https://alsunnah.com' },
              ]},
            ].map(section => (
              <div key={section.tier} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{section.tier}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.sources.map(s => (
                    <div key={s.name} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.desc}</div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline mt-1 block">{s.url}</a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADMIN TAB */}
        {tab === 'admin' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flagged posts queue</div>
                <button onClick={fetchQueue} className="text-xs text-emerald-600 hover:underline">Refresh</button>
              </div>
              {queueLoading && <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>}
              {!queueLoading && queue.length === 0 && <div className="text-sm text-gray-400 py-8 text-center">No flagged posts yet.</div>}
              {queue.map(item => (
                <div key={item.id} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span className={`text-xs px-2 py-1 rounded-full h-fit flex-shrink-0 ${item.verdict === 'fabricated' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{item.verdict}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 line-clamp-2">{item.claim_summary || item.post_text?.slice(0, 100)}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString()} · {item.lang?.toUpperCase()}</div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => { navigator.clipboard.writeText(item.suggested_comment); alert('Copied!') }}
                      className="text-xs px-3 py-1 rounded border border-green-200 bg-green-50 text-green-700">Copy</button>
                    <button onClick={() => alert('Open Facebook → find post → 3 dots → Report → False information')}
                      className="text-xs px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700">Report</button>
                    <button onClick={() => dismissFromQueue(item.id)}
                      className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-500">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <strong>Admin policy:</strong> AI flags, humans decide. Never auto-delete or auto-ban.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
