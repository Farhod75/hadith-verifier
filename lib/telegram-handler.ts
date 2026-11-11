// lib/telegram-handler.ts
// P398: what @HadithVerifierBot does with one private message. The webhook route
// (app/api/telegram/webhook/route.ts) answers Telegram at once and runs this after the
// response; everything it touches comes in as a dependency so tests/telegram-bot.spec.ts
// can drive it without Telegram, the model or the network.

import type { AnalyzeInput, AnalyzeOutcome } from '@/lib/analyze'
import { rateLimitMessage } from '@/lib/analyze-limit'
import {
  type BotLang, classifyInput, detectPostLang, formatBlocks, langFromTelegram, pack, ui, welcomeMulti, welcomeText,
} from '@/lib/telegram-bot'

export type TgMessage = {
  message_id: number
  chat: { id: number; type: string }
  from?: { id: number; language_code?: string }
  text?: string; caption?: string
  photo?: { file_id: string; file_size?: number }[]
  document?: { file_id: string; mime_type?: string; file_size?: number }
  video?: unknown; video_note?: unknown; animation?: unknown; voice?: unknown; audio?: unknown
}

export type Deps = {
  send: (method: string, body: Record<string, unknown>) => Promise<any>
  analyze: (input: AnalyzeInput) => Promise<AnalyzeOutcome>
  downloadImage: (fileId: string) => Promise<{ base64: string; mediaType: string } | null>
  userAllowed: (userId: number) => boolean
  dailyAllowed: () => boolean
}

export const USER_HOURLY_CAP = 10
export const BOT_DAILY_CAP = 300

/** At most `cap` checks per user per rolling hour, in this instance's memory. */
export function createUserLimiter(cap = USER_HOURLY_CAP, windowMs = 3_600_000) {
  const hits = new Map<number, number[]>()
  return (userId: number, now = Date.now()) => {
    const recent = (hits.get(userId) || []).filter(t => now - t < windowMs)
    if (recent.length >= cap) { hits.set(userId, recent); return false }
    recent.push(now); hits.set(userId, recent)
    if (hits.size > 5000) hits.delete(hits.keys().next().value as number)
    return true
  }
}

export function createDailyCounter(cap = BOT_DAILY_CAP) {
  let day = '', count = 0
  return (now = new Date()) => {
    const d = now.toISOString().slice(0, 10)
    if (d !== day) { day = d; count = 0 }
    if (count >= cap) return false
    count++
    return true
  }
}

const html = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }

export async function handleMessage(msg: TgMessage, deps: Deps): Promise<void> {
  const chatId = msg.chat.id
  const appLang = langFromTelegram(msg.from?.language_code)
  const text = msg.text || msg.caption || ''

  if (msg.text && msg.text.startsWith('/')) {
    const cmd = msg.text.split(/\s+/)[0].slice(1).split('@')[0].toLowerCase()
    const named: Record<string, BotLang> = { lang_en: 'en', lang_ru: 'ru', lang_uz: 'uz', lang_uzl: 'uz_latin', lang_tj: 'tj', lang_ar: 'ar' }
    if (named[cmd]) {
      await deps.send('sendMessage', { chat_id: chatId, text: ui('langNote', named[cmd]) })
      return
    }
    // P399: an English or unknown app language gets the four-language welcome
    await deps.send('sendMessage', { chat_id: chatId, text: appLang === 'en' ? welcomeMulti() : welcomeText(appLang), ...html })
    return
  }

  const imageFile = msg.photo?.length ? msg.photo[msg.photo.length - 1].file_id
    : (msg.document && (msg.document.mime_type || '').startsWith('image/')) ? msg.document.file_id : null
  const hasVideo = !!(msg.video || msg.video_note || msg.animation || msg.voice || msg.audio)
  const kind = classifyInput(text, !!imageFile, hasVideo)
  const lang: BotLang = detectPostLang(text) || appLang

  if (kind === 'too_short') { await deps.send('sendMessage', { chat_id: chatId, text: ui('tooShort', lang) }); return }
  if (kind === 'video_only') { await deps.send('sendMessage', { chat_id: chatId, text: ui('noMedia', lang) }); return }
  if (!deps.userAllowed(msg.from?.id ?? chatId)) { await deps.send('sendMessage', { chat_id: chatId, text: ui('userLimit', lang) }); return }
  if (!deps.dailyAllowed()) { await deps.send('sendMessage', { chat_id: chatId, text: rateLimitMessage(lang) }); return }

  const status = await deps.send('sendMessage', { chat_id: chatId, text: ui('checking', lang), reply_parameters: { message_id: msg.message_id } })
  const statusId: number | undefined = status?.result?.message_id
  const replace = async (body: Record<string, unknown>) => statusId
    ? deps.send('editMessageText', { chat_id: chatId, message_id: statusId, ...body })
    : deps.send('sendMessage', { chat_id: chatId, ...body })

  try {
    await deps.send('sendChatAction', { chat_id: chatId, action: 'typing' })
    let image: { base64: string; mediaType: string } | null = null
    if (kind === 'image' && imageFile) {
      image = await deps.downloadImage(imageFile)
      if (!image) { await replace({ text: ui('failed', lang) }); return }
    }
    const outcome = await deps.analyze({
      postText: text, lang, imageBase64: image?.base64, imageMediaType: image?.mediaType,
    })
    if (!outcome.ok) { await replace({ text: ui('failed', lang) }); return }
    const messages = pack(formatBlocks(outcome.result, lang))
    const first = await replace({ text: messages[0], ...html })
    if (first && first.ok === false) {
      // Telegram refused the HTML (it should not - everything is escaped): send it as plain text
      await replace({ text: messages[0].replace(/<[^>]+>/g, '') })
    }
    for (const m of messages.slice(1)) await deps.send('sendMessage', { chat_id: chatId, text: m, ...html })
  } catch (e: any) {
    console.error('telegram bot: check failed:', e?.message)
    await replace({ text: ui('failed', lang) }).catch(() => undefined)
  }
}
