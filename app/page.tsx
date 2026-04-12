'use client'

import { useState, useRef, useEffect } from 'react'

type Lang = 'en' | 'uz' | 'ar' | 'ru'
type Tab = 'analyze' | 'sources' | 'admin'
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

export default function Home() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [lang, setLang] = useState<Lang>('en')
  const [postText, setPostText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ total: 0, fabricated: 0, authentic: 0 })
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tab === 'admin') fetchQueue()
  }, [tab])

  async function fetchQueue() {
    setQueueLoading(true)
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
    } catch { setQueue([]) }
    setQueueLoading(false)
  }

  function handleImageSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setPostText('')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageSelect(file)
  }

  function clearImage() {
    setImage(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function analyze() {
    if (!postText.trim() && !image) return
    setLoading(true)
    setResult(null)

    try {
      let res
      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        formData.append('lang', lang)
        if (postText.trim()) formData.append('postText', postText)
        res = await fetch('/api/analyze', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postText, lang })
        })
      }

      const data = await res.json()
      if (data.error) { alert('Error: ' + data.error); return }
      setResult(data)
      setStats(prev => ({
        total: prev.total + 1,
        fabricated: prev.fabricated + (data.verdict === 'fabricated' || data.verdict === 'weak' ? 1 : 0),
        authentic: prev.authentic + (data.verdict === 'authentic' ? 1 : 0)
      }))
    } catch (e) { alert('Analysis failed. Check your API key.') }
    setLoading(false)
  }

  async function dismissFromQueue(id: string) {
    await fetch('/api/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setQueue(q => q.filter(i => i.id !== id))
  }

  function copyComment() {
    if (!result?.suggested_comment) return
    navigator.clipboard.writeText(result.suggested_comment)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function clearAll() {
    setPostText('')
    setResult(null)
    clearImage()
  }

  const vc = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-lg">☽</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Hadith Verifier</h1>
            <p className="text-xs text-gray-500">Multi-source authentication · EN · UZ · AR · RU</p>
          </div>
          <div className="ml-auto flex gap-4 text-center">
            <div><div className="text-lg font-semibold text-gray-900">{stats.total}</div><div className="text-xs text-gray-500">Checked</div></div>
            <div><div className="text-lg font-semibold text-red-700">{stats.fabricated}</div><div className="text-xs text-gray-500">Flagged</div></div>
            <div><div className="text-lg font-semibold text-green-700">{stats.authentic}</div><div className="text-xs text-gray-500">Authentic</div></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['analyze', 'sources', 'admin'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-emerald-600 text-emerald-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'admin' ? `Admin queue${queue.length ? ` (${queue.length})` : ''}` : t}
            </button>
          ))}
        </div>

        {/* ANALYZE TAB */}
        {tab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">

              {/* Input mode toggle */}
              <div className="flex gap-2 mb-3">
                <button onClick={clearImage}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Paste text
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${imagePreview ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
                  Upload screenshot
                </button>
              </div>

              {/* Image upload area */}
              {!imagePreview ? (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Paste post content</div>
                  <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    placeholder="Paste Facebook, Instagram, or WhatsApp post text here — any language (Uzbek, Arabic, Russian, English...)"
                    className="w-full min-h-28 text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-emerald-500 bg-gray-50"
                  />
                  {/* Drag and drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-xs text-gray-400">Or drag & drop a screenshot here · Click to browse</div>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Screenshot uploaded — Claude Vision will read it</div>
                  <img src={imagePreview} alt="Uploaded screenshot" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                  <button onClick={clearImage}
                    className="absolute top-6 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded hover:bg-red-200">
                    Remove
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]) }}
              />

              {/* Example buttons — only show for text mode */}
              {!imagePreview && (
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <span className="text-xs text-gray-400">Try:</span>
                  {Object.entries({ 'Fabricated (Uzbek)': 'uz', 'Chain message': 'chain', 'Authentic': 'authentic' }).map(([label, key]) => (
                    <button key={key} onClick={() => setPostText(EXAMPLES[key as keyof typeof EXAMPLES])}
                      className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Actions row */}
              <div className="flex gap-2 mt-3 items-center flex-wrap">
                <button onClick={analyze} disabled={loading || (!postText.trim() && !image)}
                  className="bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                  {loading ? (
                    <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    {image ? 'Reading image...' : 'Analyzing...'}</>
                  ) : (
                    image ? 'Analyze screenshot' : 'Analyze post'
                  )}
                </button>
                <button onClick={clearAll}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Clear
                </button>
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

            {/* Result */}
            {result && vc && (
              <div className="space-y-3">
                {/* Extracted text from image */}
                {result.extracted_text && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Text extracted from screenshot</div>
                    <div className="text-sm text-blue-800 leading-relaxed">{result.extracted_text}</div>
                  </div>
                )}

                {/* Verdict */}
                <div className={`rounded-xl border p-4 ${vc.bg} ${vc.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${vc.badge}`}>{vc.label}</span>
                    <span className="text-xs text-gray-500">{result.confidence} confidence</span>
                  </div>
                  <div className={`font-medium mb-2 ${vc.text}`}>{result.claim_summary}</div>
                  <div className={`text-sm leading-relaxed ${vc.text}`}>{result.analysis}</div>
                  {result.red_flags?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">Red flags detected</div>
                      {result.red_flags.map((f, i) => (
                        <div key={i} className="flex gap-2 text-xs mb-1"><span>◆</span><span>{f}</span></div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sources */}
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
                                <span className="text-xs font-medium text-gray-800">{ref.source}</span>
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

                {/* Comment */}
                {result.suggested_comment && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Ready-to-post comment ({lang.toUpperCase()})
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                      {result.suggested_comment}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={copyComment}
                        className="text-sm px-4 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                        {copied ? 'Copied!' : 'Copy comment'}
                      </button>
                      {(result.verdict === 'fabricated' || result.verdict === 'weak') && (
                        <button onClick={() => setTab('admin')}
                          className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
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

        {/* SOURCES TAB */}
        {tab === 'sources' && (
          <div className="space-y-4">
            {[
              { tier: 'Tier 1 — Primary collections (highest authority)', sources: [
                { name: 'Dorar.net (الدرر السنية)', desc: '520,000+ hadiths, 400 volumes, 150,000 narrator biographies. JSON API.', url: 'https://dorar.net' },
                { name: 'Sunnah.com', desc: '9 major collections: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Muwatta, Ahmad, Darimi.', url: 'https://sunnah.com' },
                { name: 'HadeethEnc.com', desc: 'Authenticated hadiths with scholarly explanations. Free REST API. Multi-language including Uzbek.', url: 'https://hadeethenc.com' },
              ]},
              { tier: 'Tier 2 — Scholarly fatwa bodies', sources: [
                { name: 'IslamQA.info', desc: 'Sheikh Saleh Al-Munajjid. 200,000+ fatwas. Dedicated hadith authentication rulings.', url: 'https://islamqa.info' },
                { name: 'IslamWeb.net', desc: 'Full takhrij: sanad, matn, narrator biography, hadith ranking.', url: 'https://islamweb.net' },
                { name: 'Yaqeen Institute', desc: 'Peer-reviewed Islamic scholarship in English.', url: 'https://yaqeeninstitute.org' },
                { name: 'Islamhouse.com', desc: 'Uzbek, Russian, Arabic, 100+ languages.', url: 'https://islamhouse.com' },
              ]},
              { tier: 'Tier 3 — Supporting sources', sources: [
                { name: 'HadithAPI.com', desc: 'Free REST API. Bukhari, Muslim, Abu Dawud, Tirmidhi.', url: 'https://hadithapi.com' },
                { name: 'AboutIslam.net', desc: 'Scholar Q&A on hadith authenticity.', url: 'https://aboutislam.net' },
                { name: 'AlSunnah.com', desc: 'Full Kutub al-Sittah searchable.', url: 'https://alsunnah.com' },
              ]},
            ].map(section => (
              <div key={section.tier} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{section.tier}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.sources.map(s => (
                    <div key={s.name} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</div>
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
              {!queueLoading && queue.length === 0 && (
                <div className="text-sm text-gray-400 py-8 text-center">No flagged posts yet.</div>
              )}
              {queue.map(item => (
                <div key={item.id} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span className={`text-xs px-2 py-1 rounded-full h-fit flex-shrink-0 ${item.verdict === 'fabricated' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.verdict}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 line-clamp-2">{item.claim_summary || item.post_text?.slice(0, 100)}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString()} · {item.lang?.toUpperCase()} reply ready</div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => { navigator.clipboard.writeText(item.suggested_comment); alert('Copied!') }}
                      className="text-xs px-3 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100">Copy</button>
                    <button onClick={() => alert('Open Facebook → find post → 3 dots → Report → False information')}
                      className="text-xs px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Report</button>
                    <button onClick={() => dismissFromQueue(item.id)}
                      className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
              <strong>Admin policy:</strong> AI flags, humans decide. Never auto-delete or auto-ban.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
