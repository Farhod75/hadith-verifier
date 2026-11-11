// app/api/telegram/webhook/route.ts
// P398: @HadithVerifierBot. Telegram POSTs each update here (setWebhook, with a secret
// that comes back in X-Telegram-Bot-Api-Secret-Token). The route answers 200 at once and
// does the check after the response (next/server after()), so Telegram never retries a
// slow analysis. Private chats only - in a group the bot would answer every message.
//
// Env (Vercel, Production): TELEGRAM_VERIFIER_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
// Without both the route answers 503 and does nothing. Registration:
// scripts/set-telegram-webhook.ps1 (the operator runs it; it holds the token).

import { NextRequest, NextResponse, after } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { analyzePost } from '@/lib/analyze'
import { createDailyCounter, createUserLimiter, handleMessage, type TgMessage } from '@/lib/telegram-handler'

export const runtime = 'nodejs'
export const maxDuration = 60

const userAllowed = createUserLimiter()
const dailyAllowed = createDailyCounter()
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

  after(() => handleMessage(msg, { send, analyze: analyzePost, downloadImage, userAllowed, dailyAllowed })
    .catch(e => console.error('telegram bot:', e?.message)))
  return NextResponse.json({ ok: true })
}
