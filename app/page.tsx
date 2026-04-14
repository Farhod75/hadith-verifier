'use client'

import { useState, useRef, useEffect } from 'react'
import { t, getDir, APP_LANGUAGES, type AppLang } from '@/lib/i18n'

type ReplyLang = 'en' | 'uz' | 'ar' | 'ru'
type Tab = 'analyze' | 'dua' | 'sources' | 'admin'
type Verdict = 'fabricated' | 'weak' | 'authentic' | 'unclear' | 'no_hadith'

interface Reference { source: string; description: string; url: string; authority: string }
interface AnalysisResult {
  extracted_text?: string; verdict: Verdict; confidence: string; claim_summary: string
  red_flags: string[]; analysis: string; authentic_alternative: string
  references: Reference[]; suggested_comment: string
}
interface DuaResult {
  extracted_text?: string; dua_identified: string; status: 'correct' | 'has_errors' | 'unknown_dua'
  errors_found: string[]; corrected_arabic: string
  transliterations: { latin_uz: string; cyrillic_uz: string; cyrillic_ru: string; english: string }
  translation: { uz: string; ru: string; en: string }
  source: { name: string; reference: string; url: string; grade: string }
  suggested_comment: { uz_latin: string; uz_cyrillic: string; ru: string; en: string }
}
interface QueueItem {
  id: string; post_text: string; verdict: string; confidence: string
  claim_summary: string; suggested_comment: string; lang: string
  created_at: string; severity: string; red_flags: string[]
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

const VERDICT_STYLE = {
  fabricated: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' },
  weak: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  authentic: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800' },
  unclear: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
  no_hadith: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
}
const SEVERITY_STYLE = {
  CRITICAL: { badge: 'bg-red-600 text-white', icon: '🔴' },
  HIGH:     { badge: 'bg-orange-500 text-white', icon: '🟠' },
  MEDIUM:   { badge: 'bg-yellow-400 text-gray-900', icon: '🟡' },
  LOW:      { badge: 'bg-green-500 text-white', icon: '🟢' },
} as const
const TIER_STYLE = {
  CRITICAL: { badge: 'bg-red-600 text-white', icon: '🔴' },
  HIGH:     { badge: 'bg-orange-500 text-white', icon: '🟠' },
  MEDIUM:   { badge: 'bg-yellow-400 text-gray-900', icon: '🟡' },
  LOW:      { badge: 'bg-green-500 text-white', icon: '🟢' },
  tier1: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800' },
  tier2: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-800' },
  tier3: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800' },
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
      {copied ? '✓' : label}
    </button>
  )
}

export default function Home() {
  const [appLang, setAppLang] = useState<AppLang>('en')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [tab, setTab] = useState<Tab>('analyze')
  const [replyLang, setReplyLang] = useState<ReplyLang>('en')
  const [postText, setPostText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [duaText, setDuaText] = useState('')
  const [duaImage, setDuaImage] = useState<File | null>(null)
  const [duaImagePreview, setDuaImagePreview] = useState('')
  const [duaLoading, setDuaLoading] = useState(false)
  const [duaResult, setDuaResult] = useState<DuaResult | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, fabricated: 0, authentic: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const duaFileInputRef = useRef<HTMLInputElement>(null)
  const tr = t(appLang)
  const dir = getDir(appLang)

  useEffect(() => { if (tab === 'admin') fetchQueue() }, [tab])

  const currentLang = APP_LANGUAGES.find(l => l.code === appLang)!

  async function fetchQueue() {
    setQueueLoading(true)
    try { const r = await fetch('/api/queue'); setQueue(await r.json()) } catch { setQueue([]) }
    setQueueLoading(false)
  }

  function handleImageSelect(file: File, isDua = false) {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = e => {
      const src = e.target?.result as string
      if (isDua) { setDuaImage(file); setDuaImagePreview(src) }
      else { setImage(file); setImagePreview(src); setPostText('') }
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!postText.trim() && !image) return
    setLoading(true); setResult(null)
    try {
      let res
      if (image) {
        const fd = new FormData(); fd.append('image', image); fd.append('lang', replyLang)
        if (postText.trim()) fd.append('postText', postText)
        res = await fetch('/api/analyze', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postText, lang: replyLang }) })
      }
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setResult(data)
      setStats(p => ({ total: p.total + 1, fabricated: p.fabricated + (['fabricated','weak'].includes(data.verdict) ? 1 : 0), authentic: p.authentic + (data.verdict === 'authentic' ? 1 : 0) }))
    } catch { alert('Analysis failed.') }
    setLoading(false)
  }

  async function analyzeDua() {
    if (!duaText.trim() && !duaImage) return
    setDuaLoading(true); setDuaResult(null)
    try {
      let res
      if (duaImage) {
        const fd = new FormData(); fd.append('image', duaImage)
        if (duaText.trim()) fd.append('duaText', duaText)
        res = await fetch('/api/dua', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/dua', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duaText }) })
      }
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setDuaResult(data)
    } catch { alert('Analysis failed.') }
    setDuaLoading(false)
  }

  const vs = result ? VERDICT_STYLE[result.verdict] : null
  const verdictLabel = result ? {
    fabricated: tr.verdictFabricated, weak: tr.verdictWeak,
    authentic: tr.verdictAuthentic, unclear: tr.verdictUnclear, no_hadith: tr.verdictNoHadith
  }[result.verdict] : ''

  const duaStatusStyle = {
    correct: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800', label: tr.duaCorrect },
    has_errors: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800', label: tr.duaHasErrors },
    unknown_dua: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800', label: tr.duaUnknown },
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-lg flex-shrink-0">☽</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">{tr.appName}</h1>
            <p className="text-xs text-gray-500 truncate">{tr.appSubtitle}</p>
          </div>

          {/* Language switcher */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              <span>{currentLang.flag}</span>
              <span className="text-gray-700">{currentLang.label}</span>
              <span className="text-gray-700 text-xs">▾</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-44 overflow-hidden">
                {APP_LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => { setAppLang(lang.code); setShowLangMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-left ${appLang === lang.code ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}>
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {appLang === lang.code && <span className="ml-auto text-emerald-600">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="hidden sm:flex gap-3 text-center flex-shrink-0">
            <div><div className="text-lg font-semibold text-gray-900">{stats.total}</div><div className="text-xs text-gray-500">{tr.statChecked}</div></div>
            <div><div className="text-lg font-semibold text-red-700">{stats.fabricated}</div><div className="text-xs text-gray-500">{tr.statFlagged}</div></div>
            <div><div className="text-lg font-semibold text-green-700">{stats.authentic}</div><div className="text-xs text-gray-500">{tr.statAuthentic}</div></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {([
            { key: 'analyze', label: tr.tabAnalyze },
            { key: 'dua', label: tr.tabDua },
            { key: 'sources', label: tr.tabSources },
            { key: 'admin', label: tr.tabAdmin + (queue.length ? ` (${queue.length})` : '') },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === key ? 'border-emerald-600 text-emerald-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ANALYZE TAB */}
        {tab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setImage(null); setImagePreview('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${!imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  {tr.pasteText}
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  {tr.uploadScreenshot}
                </button>
              </div>

              {!imagePreview ? (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{tr.pastePostContent}</div>
                  <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder={tr.postPlaceholder}
                    className="w-full min-h-28 text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-emerald-500 bg-gray-50" dir="auto" />
                  <div onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer border-gray-200 hover:border-gray-300">
                    <div className="text-xs text-gray-700">{tr.dragDrop}</div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="text-xs text-gray-700">{tr.tryLabel}</span>
                    <button onClick={() => setPostText(EXAMPLES.uz)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleFabricated}</button>
                    <button onClick={() => setPostText(EXAMPLES.chain)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleChain}</button>
                    <button onClick={() => setPostText(EXAMPLES.authentic)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleAuthentic}</button>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Screenshot — Claude Vision</div>
                  <img src={imagePreview} alt="Screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                  <button onClick={() => { setImage(null); setImagePreview('') }}
                    className="absolute top-6 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">{tr.removeImage}</button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }} />

              <div className="flex gap-2 mt-3 items-center flex-wrap">
                <button onClick={analyze} disabled={loading || (!postText.trim() && !image)}
                  className="bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-40 flex items-center gap-2">
                  {loading ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{image ? tr.readingImage : tr.analyzing}</> : image ? tr.analyzeScreenshot : tr.analyzePost}
                </button>
                <button onClick={() => { setPostText(''); setResult(null); setImage(null); setImagePreview('') }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.clear}</button>
                <div className="ml-auto flex gap-1 items-center">
                  <span className="text-xs text-gray-700 mr-1">{tr.replyIn}</span>
                  {(['en', 'uz', 'ar', 'ru'] as ReplyLang[]).map(l => (
                    <button key={l} onClick={() => setReplyLang(l)}
                      className={`text-xs px-3 py-1 rounded-full border ${replyLang === l ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-gray-200 text-gray-500'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {result && vs && (
              <div className="space-y-3">
                {result.extracted_text && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">{tr.extractedFromScreenshot}</div>
                    <div className="text-sm text-blue-800">{result.extracted_text}</div>
                  </div>
                )}
                <div className={`rounded-xl border p-4 ${vs.bg} ${vs.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${vs.badge}`}>{verdictLabel}</span>
                    <span className="text-xs text-gray-500">{result.confidence === 'high' ? tr.highConfidence : result.confidence === 'medium' ? tr.mediumConfidence : tr.lowConfidence}</span>
                  </div>
                  <div className={`font-medium mb-2 ${vs.text}`}>{result.claim_summary}</div>
                  <div className={`text-sm leading-relaxed ${vs.text}`}>{result.analysis}</div>
                  {result.red_flags?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">{tr.redFlagsDetected}</div>
                      {result.red_flags.map((f, i) => <div key={i} className="flex gap-2 text-xs mb-1"><span>◆</span><span>{f}</span></div>)}
                    </div>
                  )}
                </div>
                {result.authentic_alternative && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{tr.authenticScholarshipSays}</div>
                    <div className="text-sm text-gray-700 mb-3">{result.authentic_alternative}</div>
                    {result.references?.length > 0 && (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{tr.verifiedSources}</div>
                        {result.references.map((ref, i) => {
                          const ts = (TIER_STYLE[ref.authority as keyof typeof TIER_STYLE] || TIER_STYLE.tier3) as { dot: string; badge: string }
                          return (
                            <div key={i} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ts.dot}`} />
                              <div>
                                <span className="text-xs font-medium">{ref.source}</span>
                                <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${ts.badge}`}>{ref.authority}</span>
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
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{tr.readyToPost} ({replyLang.toUpperCase()})</div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap" dir="auto">{result.suggested_comment}</div>
                    <div className="flex gap-2 mt-3">
                      <CopyButton text={result.suggested_comment} label={tr.copyComment} />
                      {['fabricated','weak'].includes(result.verdict) && (
                        <button onClick={() => setTab('admin')} className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.viewInAdminQueue}</button>
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
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{tr.duaCorrectorTitle}</div>
              <div className="text-xs text-gray-700 mb-3">{tr.duaCorrectorSubtitle}</div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setDuaImage(null); setDuaImagePreview('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${!duaImagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  {tr.pasteText}
                </button>
                <button onClick={() => duaFileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${duaImagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  {tr.uploadScreenshot}
                </button>
              </div>
              {!duaImagePreview ? (
                <>
                  <textarea value={duaText} onChange={e => setDuaText(e.target.value)} placeholder={tr.duaPlaceholder}
                    className="w-full min-h-28 text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-emerald-500 bg-gray-50" dir="auto" />
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    <span className="text-xs text-gray-700">{tr.tryLabel}</span>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.wrong)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleWrongOrder}</button>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.arabic_only)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleArabicOnly}</button>
                    <button onClick={() => setDuaText(DUA_EXAMPLES.transliteration)} className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.exampleTransliteration}</button>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <img src={duaImagePreview} alt="Screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                  <button onClick={() => { setDuaImage(null); setDuaImagePreview('') }} className="absolute top-2 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">{tr.removeImage}</button>
                </div>
              )}
              <input ref={duaFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], true) }} />
              <div className="flex gap-2 mt-3">
                <button onClick={analyzeDua} disabled={duaLoading || (!duaText.trim() && !duaImage)}
                  className="bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-40 flex items-center gap-2">
                  {duaLoading ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{tr.checking}</> : tr.checkDua}
                </button>
                <button onClick={() => { setDuaText(''); setDuaResult(null); setDuaImage(null); setDuaImagePreview('') }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">{tr.clear}</button>
              </div>
            </div>

            {duaResult && (() => {
              const ds = duaStatusStyle[duaResult.status]
              return (
                <div className="space-y-3">
                  {duaResult.extracted_text && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">{tr.extractedFromScreenshot}</div>
                      <div className="text-sm text-blue-800">{duaResult.extracted_text}</div>
                    </div>
                  )}
                  <div className={`rounded-xl border p-4 ${ds.bg} ${ds.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ds.badge}`}>{ds.label}</span>
                      {duaResult.dua_identified && <span className="text-xs text-gray-500">{duaResult.dua_identified}</span>}
                    </div>
                    {duaResult.errors_found?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">{tr.errorsFound}</div>
                        {duaResult.errors_found.map((e, i) => <div key={i} className="flex gap-2 text-xs mb-1"><span>◆</span><span>{e}</span></div>)}
                      </div>
                    )}
                  </div>

                  {duaResult.corrected_arabic && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{tr.correctArabic}</div>
                      <div className="text-2xl text-right leading-loose text-gray-900 p-3 bg-gray-50 rounded-lg" dir="rtl">{duaResult.corrected_arabic}</div>
                      <div className="mt-2 flex justify-end"><CopyButton text={duaResult.corrected_arabic} label={tr.copyArabic} /></div>
                      {duaResult.source?.url && (
                        <div className="mt-3 text-xs text-gray-500">
                          {tr.source}: <a href={duaResult.source.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">{duaResult.source.name} — {duaResult.source.reference}</a>
                          {duaResult.source.grade && <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{duaResult.source.grade}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {duaResult.transliterations && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{tr.transliterations}</div>
                      <div className="space-y-3">
                        {[
                          { key: 'latin_uz', label: "🇺🇿 Uzbek Latin", desc: "Yosh avlod uchun" },
                          { key: 'cyrillic_uz', label: '🇺🇿 Ўзбек Кирилл', desc: "Кекса авлод учун (50+)" },
                          { key: 'cyrillic_ru', label: '🇷🇺 Русский', desc: "" },
                          { key: 'english', label: '🇬🇧 English', desc: "" },
                        ].map(({ key, label, desc }) => {
                          const text = duaResult.transliterations[key as keyof typeof duaResult.transliterations]
                          if (!text) return null
                          return (
                            <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-1">
                                <div><span className="text-xs font-medium text-gray-700">{label}</span>{desc && <span className="text-xs text-gray-700 ml-2">{desc}</span>}</div>
                                <CopyButton text={text} label={tr.copyBtn} />
                              </div>
                              <div className="text-sm text-gray-800 leading-relaxed">{text}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {duaResult.translation && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{tr.meaning}</div>
                      <div className="space-y-2">
                        {[{ key: 'uz', label: '🇺🇿 Oʻzbek' }, { key: 'ru', label: '🇷🇺 Русский' }, { key: 'en', label: '🇬🇧 English' }].map(({ key, label }) => {
                          const text = duaResult.translation[key as keyof typeof duaResult.translation]
                          if (!text) return null
                          return (
                            <div key={key} className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
                              <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">{label}</span>
                              <span className="text-sm text-gray-700">{text}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {duaResult.suggested_comment && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{tr.correctionComments}</div>
                      <div className="space-y-3">
                        {[
                          { key: 'uz_latin', label: "🇺🇿 O'zbek Latin" },
                          { key: 'uz_cyrillic', label: '🇺🇿 Ўзбек Кирилл' },
                          { key: 'ru', label: '🇷🇺 Русский' },
                          { key: 'en', label: '🇬🇧 English' },
                        ].map(({ key, label }) => {
                          const text = duaResult.suggested_comment[key as keyof typeof duaResult.suggested_comment]
                          if (!text) return null
                          return (
                            <div key={key} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">{label}</span>
                                <CopyButton text={text} label={tr.copyBtn} />
                              </div>
                              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap" dir="auto">{text}</div>
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
              { tier: tr.tier1Title, sources: [
                { name: 'Dorar.net (الدرر السنية)', desc: '520,000+ hadiths, narrator biographies. JSON API.', url: 'https://dorar.net' },
                { name: 'Sunnah.com', desc: 'Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Muwatta, Ahmad, Darimi.', url: 'https://sunnah.com' },
                { name: 'HadeethEnc.com', desc: 'Authenticated hadiths. Free API. Uzbek included.', url: 'https://hadeethenc.com' },
              ]},
              { tier: tr.tier2Title, sources: [
                { name: 'IslamQA.info', desc: 'Sheikh Saleh Al-Munajjid. 200,000+ fatwas.', url: 'https://islamqa.info' },
                { name: 'IslamWeb.net', desc: 'Full takhrij: sanad, matn, narrator biography.', url: 'https://islamweb.net' },
                { name: 'Yaqeen Institute', desc: 'Peer-reviewed Islamic scholarship.', url: 'https://yaqeeninstitute.org' },
                { name: 'Islamhouse.com', desc: 'Uzbek, Russian, Arabic, 100+ languages.', url: 'https://islamhouse.com' },
              ]},
              { tier: tr.tier3Title, sources: [
                { name: 'HadithAPI.com', desc: 'Free REST API.', url: 'https://hadithapi.com' },
                { name: 'AboutIslam.net', desc: 'Scholar Q&A.', url: 'https://aboutislam.net' },
                { name: 'AlSunnah.com', desc: 'Full Kutub al-Sittah.', url: 'https://alsunnah.com' },
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
                <div className="mt-3 text-xs text-gray-700">{tr.sourceAuthorityNote}</div>
              </div>
            ))}
          </div>
        )}

        {/* ADMIN TAB */}
        {tab === 'admin' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {tr.flaggedPostsQueue}
                  {queue.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {queue.length}
                    </span>
                  )}
                </div>
                <button onClick={fetchQueue} className="text-xs text-emerald-600 hover:underline">{tr.refresh}</button>
              </div>

              {queueLoading && (
                <div className="flex items-center justify-center py-8 gap-2">
                  <span className="w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-700">Loading...</span>
                </div>
              )}

              {!queueLoading && queue.length === 0 && (
                <div className="text-sm text-gray-700 py-8 text-center">{tr.noFlaggedPosts}</div>
              )}

              <div className="space-y-3">
                {queue.map(item => {
                  const sev = item.severity || 'MEDIUM'
                  const ss = SEVERITY_STYLE[sev as keyof typeof SEVERITY_STYLE] || SEVERITY_STYLE.MEDIUM
                  return (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors">
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ss.badge}`}>
                          {ss.icon} {sev}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${item.verdict === 'fabricated' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.verdict}
                        </span>
                        {item.confidence && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {item.confidence} confidence
                          </span>
                        )}
                        <span className="text-xs text-gray-700 ml-auto">
                          {new Date(item.created_at).toLocaleDateString()} · {item.lang?.toUpperCase()}
                        </span>
                      </div>

                      {/* Claim */}
                      <div className="text-sm font-medium text-gray-800 mb-2">
                        {item.claim_summary || item.post_text?.slice(0, 120)}
                      </div>

                      {/* Red flags */}
                      {item.red_flags?.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-700 mb-1">Red flags:</div>
                          <div className="flex flex-wrap gap-1">
                            {item.red_flags.slice(0, 3).map((f, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested comment preview */}
                      {item.suggested_comment && (
                        <div className="text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100 mb-3 line-clamp-2" dir="auto">
                          {item.suggested_comment}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { navigator.clipboard.writeText(item.suggested_comment); alert(tr.copied) }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium">
                          📋 {tr.copyBtn}
                        </button>
                        <button
                          onClick={() => alert(tr.reportInstruction)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                          🚩 {tr.reportBtn}
                        </button>
                        <button
                          onClick={async () => {
                            await fetch('/api/queue', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) })
                            setQueue(q => q.filter(i => i.id !== item.id))
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100">
                          ✓ {tr.dismissBtn}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">{tr.adminPolicy}</div>
          </div>
        )}
      </main>
    </div>
  )
}
