// app/api/telegram/webhook/route.ts
// P398: @HadithVerifierBot. Telegram POSTs each update here (setWebhook, with a secret
// that comes back in X-Telegram-Bot-Api-Secret-Token). The route answers 200 at once and
// does the check after the response (next/server after()), so Telegram never retries a
// slow analysis. Private chats only - in a group the bot would answer every message.
//
// Env (Vercel, Production): TELEGRAM_VERIFIER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
// Without both the route answers 503 and does nothing.
// P405: ELEVENLABS_API_KEY for video speech (Scribe); without it a video gets "check failed". Registration:
// scripts/set-telegram-webhook.ps1 (the operator runs it; it holds the token).

import { NextRequest, NextResponse, after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { analyzePost } from '@/lib/analyze'
import {
  MAX_VIDEO_BYTES, VIDEO_BOT_DAILY_CAP, VIDEO_USER_DAILY_CAP, createDailyCounter, createUserLimiter, handleMessage,
  type Media, type TgMessage,
} from '@/lib/telegram-handler'
import { bumpCounter } from '@/lib/shared-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

const userAllowed = createUserLimiter()
const dailyAllowed = createDailyCounter()
// P411: the video caps are counted in Supabase, so every instance shares them and a cold
// start does not reset them. If the counter cannot be reached, the DAILY check refuses
// (videos cost money) and the per-user check steps aside, so the user is not told
// "you have used 3" when they have not.
const DAY = 86_400
const videoUserAllowed = async (userId: number) =>
  (await bumpCounter(`bot:video:user:${userId}`, DAY, VIDEO_USER_DAILY_CAP)) !== false
const videoDailyAllowed = async () =>
  (await bumpCounter('bot:video:all', DAY, VIDEO_BOT_DAILY_CAP)) === true
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024        // the model's image limit

function secretMatches(header: string | null, secret: string): boolean {
  if (!header) return false
  const a = Buffer.from(header), b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_VERIFIER_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!token || !secret) return NextResponse.json({ error: 'bot not configured' }, { status: 503 })
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'), secret)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 })
  }

  const update = await req.json().catch(() => null)
  const msg: TgMessage | undefined = update?.message
  if (!msg || msg.chat?.type !== 'private') return NextResponse.json({ ok: true })

  const api = `https://api.telegram.org/bot${token}`
  const send = async (method: string, body: Record<string, unknown>) => {
    const r = await fetch(`${api}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const j = await r.json().catch(() => ({ ok: false }))
    if (!j.ok) console.error('telegram', method, j.description)
    return j
  }
  const downloadImage = async (fileId: string) => {
    const f = await send('getFile', { file_id: fileId })
    const path: string | undefined = f?.result?.file_path
    if (!path || (f.result.file_size ?? 0) > MAX_IMAGE_BYTES) return null
    const r = await fetch(`https://api.telegram.org/file/bot${token}/${path}`)
    if (!r.ok) return null
    const bytes = Buffer.from(await r.arrayBuffer())
    if (bytes.length > MAX_IMAGE_BYTES) return null
    const ext = path.split('.').pop()?.toLowerCase()
    const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return { base64: bytes.toString('base64'), mediaType }
  }

  // P405: the video itself goes to Scribe (it accepts MP4/MOV/WebM/OGG directly - no ffmpeg)
  const downloadMedia = async (fileId: string): Promise<Media | 'too_large' | null> => {
    const f = await send('getFile', { file_id: fileId })
    if (!f?.ok) return /too big/i.test(f?.description || '') ? 'too_large' : null
    const path: string | undefined = f.result?.file_path
    if (!path) return null
    if ((f.result.file_size ?? 0) > MAX_VIDEO_BYTES) return 'too_large'
    const r = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, { signal: AbortSignal.timeout(20_000) })
    if (!r.ok) return null
    const bytes = new Uint8Array(await r.arrayBuffer())
    if (bytes.length > MAX_VIDEO_BYTES) return 'too_large'
    const fileName = path.split('/').pop() || 'video.mp4'
    const ext = fileName.split('.').pop()?.toLowerCase()
    const mimeType = ({ mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', oga: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4' } as Record<string, string>)[ext || ''] || 'application/octet-stream'
    return { bytes, fileName, mimeType }
  }
  const transcribe = async (media: Media) => {
    const key = process.env.ELEVENLABS_API_KEY
    if (!key) { console.error('telegram bot: ELEVENLABS_API_KEY not set'); return null }
    const form = new FormData()
    form.append('model_id', STT_MODEL)
    form.append('tag_audio_events', 'false')
    form.append('file', new Blob([media.bytes as BlobPart], { type: media.mimeType }), media.fileName)
    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST', headers: { 'xi-api-key': key }, body: form, signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) { console.error('telegram bot: scribe', r.status, (await r.text().catch(() => '')).slice(0, 200)); return null }
    const j = await r.json().catch(() => null)
    return j ? { text: String(j.text || ''), languageCode: j.language_code } : null
  }
  after(() => handleMessage(msg, {
    send, analyze: analyzePost, downloadImage, userAllowed, dailyAllowed,
    downloadMedia, transcribe, videoUserAllowed, videoDailyAllowed,
  })
    .catch(e => console.error('telegram bot:', e?.message)))
  return NextResponse.json({ ok: true })
}
