// tests/telegram-bot.spec.ts
// P398: @HadithVerifierBot - helpers and the message handler with fake Telegram/model
// (no server, no network), plus the webhook route refusing anyone without the secret.
import { test, expect } from '@playwright/test'
import {
  LANGS, UI, VERDICT_LABEL, classifyInput, detectPostLang, findTikTokUrl, formatBlocks, langFromTelegram, pack, scribeLang,
} from '../lib/telegram-bot'
import {
  createDailyCounter, createUserDailyLimiter, createUserLimiter, handleMessage, type Deps, type TgMessage,
} from '../lib/telegram-handler'

const RESULT = {
  verdict: 'fabricated', confidence: 'high',
  claim_summary: 'Reading <Fatiha> 4 times = 4000 days_of_charity *reward*',
  analysis: 'No isnad & no collection.',
  red_flags: ['Reward inflation', '  '],
  authentic_alternative: 'Fatiha is the greatest surah (Bukhari 4474).',
  references: [
    { source: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:4474', description: 'the greatest surah', authority: 'tier1' },
    { source: 'No link', url: '', description: '', authority: 'tier3' },
  ],
  suggested_comment: 'Assalamu alaykum <3 - please check before sharing.',
}

test.describe('bot helpers (P398)', () => {
  test('Telegram app language -> reply language', () => {
    expect(langFromTelegram('ru')).toBe('ru')
    expect(langFromTelegram('tg')).toBe('tj')
    expect(langFromTelegram('uz')).toBe('uz')
    expect(langFromTelegram('en-US')).toBe('en')
    expect(langFromTelegram(undefined)).toBe('en')
    expect(langFromTelegram('de')).toBe('en')
  })

  test('a reply goes in the language of the post', () => {
    expect(detectPostLang('Расулуллоҳ соллаллоҳу алайҳи васаллам айтдилар: ким ухлашдан олдин ўқиса')).toBe('uz')
    expect(detectPostLang('Паёмбар (с) фармуданд: ҳар кӣ пеш аз хоб сураи Ихлосро се бор бихонад')).toBe('tj')
    expect(detectPostLang('Пророк, мир ему, сказал: кто прочитает эту суру семь раз перед сном')).toBe('ru')
    expect(detectPostLang("Rasululloh aytdilar: kim uxlashdan oldin 4 marta Fotiha oʻqisa savob yoziladi va bilan")).toBe('uz_latin')
    expect(detectPostLang('The Prophet said whoever reads this dua seven times will be forgiven')).toBe('en')
  })

  test('Arabic alone, links and hashtags do not decide the language', () => {
    expect(detectPostLang('قال رسول الله صلى الله عليه وسلم من قرأ')).toBeNull()
    expect(detectPostLang('https://www.instagram.com/reel/DeuKjPEBFKT/?igsh=abcdefghijklmnop')).toBeNull()
    expect(detectPostLang('Пророк сказал: кто прочитает суру #hadith #islam #sunnah https://t.me/x')).toBe('ru')
  })

  test('what the user sent', () => {
    expect(classifyInput('', true, false)).toBe('image')
    expect(classifyInput('Пророк сказал: кто прочитает эту суру', false, false)).toBe('text')
    expect(classifyInput('https://www.instagram.com/reel/DeuKjPEBFKT/', false, false)).toBe('other_link')
    expect(classifyInput('', false, true)).toBe('video')                       // P405
    expect(classifyInput('Пророк сказал: кто прочитает эту суру', false, true)).toBe('video')
    expect(classifyInput('ok', false, false)).toBe('too_short')
    expect(classifyInput('Смотрите! Пророк сказал: кто прочитает https://www.tiktok.com/@x/video/1', false, false)).toBe('tiktok_link')
    expect(classifyInput('https://vm.tiktok.com/ZMabc123/', false, false)).toBe('tiktok_link')
    expect(classifyInput('Смотрите! Пророк сказал: кто прочитает https://youtu.be/abc', false, false)).toBe('text')
  })

  test('every model string is escaped; Markdown characters are harmless', () => {
    const text = formatBlocks(RESULT, 'en').join('\n\n')
    expect(text).toContain('&lt;Fatiha&gt;')
    expect(text).toContain('&amp; no collection')
    expect(text).toContain('&lt;3')
    expect(text).not.toContain('<Fatiha>')
    expect(text).toContain('days_of_charity *reward*')
  })

  test('verdict, sources, the comment to copy and the not-a-fatwa line', () => {
    const blocks = formatBlocks(RESULT, 'ru')
    const text = blocks.join('\n\n')
    expect(text).toContain('Выдуманный')
    expect(text).toContain('<a href="https://sunnah.com/bukhari:4474">Sahih al-Bukhari</a>')
    expect(text).toContain('• No link')
    expect(text).toContain('<code>Assalamu alaykum &lt;3')
    expect(blocks[blocks.length - 1]).toContain('не фетва')
    expect(text.split('• ').length - 1).toBe(3)            // the empty red flag is dropped
  })

  test('every language has every string', () => {
    for (const [k, table] of Object.entries(UI)) expect(Object.keys(table).sort(), k).toEqual([...LANGS].sort())
    for (const [k, table] of Object.entries(VERDICT_LABEL)) expect(Object.keys(table).sort(), k).toEqual([...LANGS].sort())
  })

  test('long answers split between blocks, never inside one', () => {
    const msgs = pack(['<b>a</b>' + 'x'.repeat(1500), '<i>b</i>' + 'y'.repeat(1500), '<code>c</code>' + 'z'.repeat(1500)], 3200)
    expect(msgs).toHaveLength(2)
    expect(msgs.every(m => m.length <= 3200)).toBe(true)
    const one = pack(['<code>' + '<'.repeat(5000) + '</code>'], 4000)
    expect(one).toHaveLength(1)
    expect(one[0].length).toBeLessThanOrEqual(4000)
    expect(one[0]).not.toContain('<code>')
  })

  test('ten checks an hour per user; a daily cap for the bot', () => {
    const allow = createUserLimiter(10, 3_600_000)
    for (let i = 0; i < 10; i++) expect(allow(1, 100_000 + i)).toBe(true)
    expect(allow(1, 200_000)).toBe(false)
    expect(allow(2, 200_000)).toBe(true)
    expect(allow(1, 100_000 + 3_600_001)).toBe(true)
    const daily = createDailyCounter(2)
    const d = new Date(Date.UTC(2026, 10, 11, 9))
    expect(daily(d)).toBe(true); expect(daily(d)).toBe(true); expect(daily(d)).toBe(false)
    expect(daily(new Date(Date.UTC(2026, 10, 12, 0, 1)))).toBe(true)
  })
})

// ---- the handler with fake Telegram and a fake model ---------------------------------
function fakeDeps(over: Partial<Deps> = {}) {
  const calls: { method: string; body: any }[] = []
  const analyzed: any[] = []
  const downloads: number[] = []
  const deps: Deps = {
    send: async (method, body) => { calls.push({ method, body }); return { ok: true, result: { message_id: 99 } } },
    analyze: async (input) => { analyzed.push(input); return { ok: true, result: RESULT } },
    downloadImage: async () => ({ base64: 'QUJD', mediaType: 'image/jpeg' }),
    userAllowed: () => true,
    dailyAllowed: () => true,
    downloadMedia: async () => { downloads.push(1); return { bytes: new Uint8Array([1, 2, 3]), fileName: 'file_1.mp4', mimeType: 'video/mp4' } },
    transcribe: async () => ({ text: 'Пророк, мир ему, сказал: кто прочитает Фатиху четыре раза, получит награду за четыре тысячи дней', languageCode: 'rus' }),
    tiktokCaption: async () => 'Пророк сказал: кто прочитает эту суру семь раз перед сном, тому простятся грехи #hadith',
    videoUserAllowed: () => true,
    videoDailyAllowed: () => true,
    ...over,
  }
  return { deps, calls, analyzed, downloads }
}
const msg = (m: Partial<TgMessage>): TgMessage => ({ message_id: 5, chat: { id: 7, type: 'private' }, from: { id: 1, language_code: 'ru' }, ...m })

test.describe('bot handler (P398)', () => {
  test('a Tajik post: "checking" in place, then the answer in Tajik as HTML', async () => {
    const { deps, calls, analyzed } = fakeDeps()
    await handleMessage(msg({ text: 'Паёмбар (с) фармуданд: ҳар кӣ пеш аз хоб сураи Ихлосро се бор бихонад' }), deps)
    expect(analyzed[0].lang).toBe('tj')
    expect(calls[0].method).toBe('sendMessage')
    expect(calls[0].body.text).toContain('Месанҷам')
    const edit = calls.find(c => c.method === 'editMessageText')!
    expect(edit.body.message_id).toBe(99)
    expect(edit.body.parse_mode).toBe('HTML')
    expect(edit.body.text).toContain('Сохта')
    expect(edit.body.text).toContain('фатво')
  })

  test('a photo with a caption goes to the model as an image', async () => {
    const { deps, analyzed } = fakeDeps()
    await handleMessage(msg({ photo: [{ file_id: 'small' }, { file_id: 'big' }], caption: '' }), deps)
    expect(analyzed[0].imageBase64).toBe('QUJD')
    expect(analyzed[0].lang).toBe('ru')                    // no text: the Telegram app language
  })

  test('an Instagram reel link gets "send the video itself" and no model call (P405)', async () => {
    const { deps, calls, analyzed } = fakeDeps()
    await handleMessage(msg({ text: 'https://www.instagram.com/reel/DeuKjPEBFKT/', from: { id: 1, language_code: 'uz' } }), deps)
    expect(analyzed).toHaveLength(0)
    expect(calls[0].body.text).toContain('Видеони сақлаб')
  })

  test('/start shows the welcome; /lang_tj explains the language rule in Tajik', async () => {
    const a = fakeDeps(); await handleMessage(msg({ text: '/start' }), a.deps)
    expect(a.calls[0].body.text).toContain('Перешлите мне любой пост')
    const b = fakeDeps(); await handleMessage(msg({ text: '/lang_tj' }), b.deps)
    expect(b.calls[0].body.text).toContain('забони пости фиристодашуда')
    expect(a.analyzed.length + b.analyzed.length).toBe(0)
  })

  test('the user cap answers without calling the model', async () => {
    const { deps, calls, analyzed } = fakeDeps({ userAllowed: () => false })
    await handleMessage(msg({ text: 'Пророк, мир ему, сказал: кто прочитает эту суру семь раз' }), deps)
    expect(analyzed).toHaveLength(0)
    expect(calls[0].body.text).toContain('10 проверок')
  })

  test('a failed analysis replaces "checking" with the failure message', async () => {
    const { deps, calls } = fakeDeps({ analyze: async () => ({ ok: false, status: 500, error: 'x' }) })
    await handleMessage(msg({ text: 'Пророк, мир ему, сказал: кто прочитает эту суру семь раз' }), deps)
    expect(calls.at(-1)!.method).toBe('editMessageText')
    expect(calls.at(-1)!.body.text).toContain('не удалась')
  })
})

test('the webhook refuses a request without the secret', async ({ request }) => {
  const r = await request.post('/api/telegram/webhook', { data: { message: { message_id: 1, chat: { id: 1, type: 'private' }, text: 'hi' } } })
  expect([401, 503]).toContain(r.status())                 // 503 locally (no token), 401 in production
})


test('/start from an English or unknown app language greets in RU, UZ, TJ and EN (P399)', async () => {
  for (const code of ['en', 'de', undefined]) {
    const { deps, calls } = fakeDeps()
    await handleMessage(msg({ text: '/start', from: { id: 1, language_code: code } }), deps)
    const text = calls[0].body.text
    expect(text).toContain('Перешлите пост')
    expect(text).toContain('Ҳадисли постни')
    expect(text).toContain('Постро бо ҳадис')
    expect(text).toContain('Forward a post')
  }
  const tj = fakeDeps(); await handleMessage(msg({ text: '/start', from: { id: 1, language_code: 'tg' } }), tj.deps)
  expect(tj.calls[0].body.text).toContain('Ба ман ҳар гуна постеро')
  expect(tj.calls[0].body.text).not.toContain('Forward a post')
})


// ---- P405: video files and TikTok links (REEL_LINK_CHECK.md) -------------------------
test.describe('video check (P405)', () => {
  const FAKE = 'кто прочитает Фатиху четыре раза, получит награду за четыре тысячи дней'
  const judge = (t: string) => ({ ok: true as const, result: { ...RESULT, verdict: t.includes(FAKE) ? 'fabricated' : 'authentic' } })

  test('helpers: TikTok link, Scribe language codes, a 3-a-day user cap', () => {
    expect(findTikTokUrl('see https://www.tiktok.com/@a/video/123?lang=ru).')).toBe('https://www.tiktok.com/@a/video/123?lang=ru')
    expect(findTikTokUrl('https://instagram.com/reel/x')).toBeNull()
    expect(scribeLang('rus')).toBe('ru'); expect(scribeLang('uzb')).toBe('uz'); expect(scribeLang('tgk')).toBe('tj')
    expect(scribeLang('ara')).toBe('ar'); expect(scribeLang('deu')).toBeNull(); expect(scribeLang(undefined)).toBeNull()
    const allow = createUserDailyLimiter(3)
    const d = new Date(Date.UTC(2026, 10, 11, 9))
    expect([allow(1, d), allow(1, d), allow(1, d), allow(1, d)]).toEqual([true, true, true, false])
    expect(allow(2, d)).toBe(true)
    expect(allow(1, new Date(Date.UTC(2026, 10, 12, 0, 1)))).toBe(true)
  })

  test('a transcript quoting a fabricated hadith reaches the same verdict as the same text pasted', async () => {
    const pasted = fakeDeps({ analyze: async (i) => judge(i.postText) })
    await handleMessage(msg({ text: 'Пророк, мир ему, сказал: ' + FAKE }), pasted.deps)
    const video = fakeDeps({ analyze: async (i) => { video.analyzed.push(i); return judge(i.postText) } })
    await handleMessage(msg({ video: { file_id: 'v1', file_size: 3_000_000 } }), video.deps)
    const verdict = (c: { method: string; body: any }[]) => c.find(x => x.method === 'editMessageText')!.body.text
    expect(verdict(pasted.calls)).toContain('Выдуманный')
    expect(verdict(video.calls)).toContain('Выдуманный')
    expect(video.analyzed[0].postText).toContain('Spoken in the video')
    expect(video.analyzed[0].lang).toBe('ru')                     // from the transcript
    expect(verdict(video.calls)).toContain('Что я услышал')      // the transcript is shown
  })

  test('the caption and the speech both go to the model', async () => {
    const { deps, analyzed } = fakeDeps()
    await handleMessage(msg({ video: { file_id: 'v1' }, caption: 'Паёмбар (с) фармуданд: ҳар кӣ пеш аз хоб бихонад' }), deps)
    expect(analyzed[0].postText).toContain('Caption of the video')
    expect(analyzed[0].postText).toContain('Spoken in the video')
    expect(analyzed[0].lang).toBe('tj')                           // the caption decides first
  })

  test('a video over 20 MB gets "too large", is not downloaded and uses up no check', async () => {
    let used = 0
    const { deps, calls, analyzed, downloads } = fakeDeps({ videoUserAllowed: () => { used++; return true } })
    await handleMessage(msg({ video: { file_id: 'big', file_size: 25 * 1024 * 1024 } }), deps)
    expect(calls[0].body.text).toContain('больше 20 МБ')
    expect(downloads).toHaveLength(0); expect(analyzed).toHaveLength(0); expect(used).toBe(0)
  })

  test('a file Telegram calls too big (size unknown up front) gets the same answer, not a crash', async () => {
    const { deps, calls, analyzed } = fakeDeps({ downloadMedia: async () => 'too_large' })
    await handleMessage(msg({ video: { file_id: 'big' } }), deps)
    expect(calls.at(-1)!.body.text).toContain('больше 20 МБ')
    expect(analyzed).toHaveLength(0)
  })

  test('the per-user and the daily video limits answer without downloading', async () => {
    const a = fakeDeps({ videoUserAllowed: () => false })
    await handleMessage(msg({ video: { file_id: 'v' } }), a.deps)
    expect(a.calls[0].body.text).toContain('3 проверки видео')
    const b = fakeDeps({ videoDailyAllowed: () => false })
    await handleMessage(msg({ video: { file_id: 'v' } }), b.deps)
    expect(b.calls[0].body.text).toContain('лимит проверки видео исчерпан')
    expect(a.downloads.length + b.downloads.length + a.analyzed.length + b.analyzed.length).toBe(0)
  })

  test('no speech and no caption: says so, no model call', async () => {
    const { deps, calls, analyzed } = fakeDeps({ transcribe: async () => ({ text: '', languageCode: 'rus' }) })
    await handleMessage(msg({ animation: { file_id: 'gif' } }), deps)
    expect(calls.at(-1)!.body.text).toContain('не расслышал речи')
    expect(analyzed).toHaveLength(0)
  })

  test('a failed transcription replaces "checking" with the failure message', async () => {
    const { deps, calls, analyzed } = fakeDeps({ transcribe: async () => null })
    await handleMessage(msg({ voice: { file_id: 'v' } }), deps)
    expect(calls.at(-1)!.body.text).toContain('не удалась')
    expect(analyzed).toHaveLength(0)
  })

  test('a TikTok link: the caption is checked, and the answer says only the caption was', async () => {
    const { deps, calls, analyzed } = fakeDeps()
    await handleMessage(msg({ text: 'https://www.tiktok.com/@a/video/123' }), deps)
    expect(analyzed[0].postText).toContain('Caption of the TikTok video')
    const answer = calls.find(c => c.method === 'editMessageText')!.body.text
    expect(answer).toContain('только подпись к TikTok')
  })

  test('a TikTok whose caption has no text (or could not be read): honest fallback, no model call', async () => {
    for (const cap of [null, '#hadith #islam']) {
      const { deps, calls, analyzed } = fakeDeps({ tiktokCaption: async () => cap })
      await handleMessage(msg({ text: 'https://vm.tiktok.com/ZMabc/' }), deps)
      expect(calls.at(-1)!.body.text).toContain('речь по ссылке я не слышу')
      expect(analyzed).toHaveLength(0)
    }
  })
})
