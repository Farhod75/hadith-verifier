// lib/telegram-bot.ts
// P398: @HadithVerifierBot's words and pure helpers. The bot itself is the webhook route
// app/api/telegram/webhook/route.ts on this same Vercel deployment - no separate server.
// Ported from the Python bot of P396 (telegram_bot.py, kept for reference); tests in
// tests/telegram-bot.spec.ts.
//
// The reply language is the language of the post (a reply belongs under it in that
// language), else the user's Telegram app language. There is no per-user setting: a
// serverless function keeps no memory between messages, and a setting that silently
// reverts would be worse than none.

export const LANGS = ['en', 'ru', 'uz', 'uz_latin', 'tj', 'ar'] as const
export type BotLang = typeof LANGS[number]

export const LANG_NAMES: Record<BotLang, string> = {
  en: 'English', ru: 'Русский', uz: 'Ўзбекча', uz_latin: 'Oʻzbekcha', tj: 'Тоҷикӣ', ar: 'العربية',
}

export function langFromTelegram(code: string | null | undefined): BotLang {
  const c = (code || '').toLowerCase().split('-')[0]
  return ({ ru: 'ru', uz: 'uz', tg: 'tj', ar: 'ar', en: 'en' } as Record<string, BotLang>)[c] || 'en'
}

const UZ_LATIN = /(?:\b[a-z]*(?:o|g)[ʻ'’‘`][a-z]*\b|\b(?:va|bilan|uchun|emas|qiladi|qilgan|kim|alloh|hadis)\b)/gi

/** The language a reply under this post belongs in, or null when the text does not tell
 *  (Arabic only, or too little). Links, @handles and #tags are ignored. PURE. */
export function detectPostLang(text: string | null | undefined): BotLang | null {
  const t = (text || '').replace(/https?:\/\/\S+|@\w+|#[^\s#]+/g, ' ')
  if (/[ӣӯҷӢӮҶ]/.test(t)) return 'tj'
  if (/[ўЎ]/.test(t)) return 'uz'
  const cyr = (t.match(/[Ѐ-ӿ]/g) || []).length
  const lat = (t.match(/[A-Za-z]/g) || []).length
  if (cyr >= 20 && cyr >= lat) return /[ҳқғҲҚҒ]/.test(t) ? 'uz' : 'ru'
  if (lat >= 20) return (t.match(UZ_LATIN) || []).length >= 2 ? 'uz_latin' : 'en'
  return null
}

const VIDEO_LINK = /https?:\/\/(?:www\.)?(?:instagram\.com|tiktok\.com|vm\.tiktok\.com|youtu\.be|youtube\.com|facebook\.com|fb\.watch)\S*/gi
export const MIN_TEXT = 10

export type InputKind = 'image' | 'text' | 'video_only' | 'too_short'
export function classifyInput(text: string, hasImage: boolean, hasVideo: boolean): InputKind {
  const t = (text || '').trim()
  if (hasImage) return 'image'
  if (t.replace(VIDEO_LINK, '').trim().length >= MIN_TEXT) return 'text'
  if (hasVideo || new RegExp(VIDEO_LINK.source, 'i').test(t)) return 'video_only'
  return 'too_short'
}

type T6 = Record<BotLang, string>
export const UI: Record<string, T6> = {
  welcome: {
    en: '🌙 <b>Hadith Verifier</b>\n\nForward me any post with a hadith - from Telegram, Instagram, Facebook or WhatsApp: the text, a photo with a caption, or a screenshot.\n\nI\'ll tell you whether the hadith is authentic, weak or fabricated, show the sources (Sunnah.com, Dorar, HadeethEnc) and give you a gentle reply you can paste under the post - in the language of the post.',
    ru: '🌙 <b>Hadith Verifier</b>\n\nПерешлите мне любой пост с хадисом - из Telegram, Instagram, Facebook или WhatsApp: текст, фото с подписью или скриншот.\n\nЯ скажу, достоверный хадис, слабый или выдуманный, покажу источники (Sunnah.com, Dorar, HadeethEnc) и дам мягкий ответ, который можно вставить под пост, - на языке самого поста.',
    uz: '🌙 <b>Hadith Verifier</b>\n\nМенга ҳадис бор ҳар қандай постни юборинг - Telegram, Instagram, Facebook ёки WhatsApp’дан: матн, изоҳли расм ёки скриншот.\n\nҲадис ишончлими, заифми ёки тўқимами - айтаман, манбаларни (Sunnah.com, Dorar, HadeethEnc) кўрсатаман ва пост остига қўйиш мумкин бўлган юмшоқ жавобни постнинг ўз тилида бераман.',
    uz_latin: '🌙 <b>Hadith Verifier</b>\n\nMenga hadis bor har qanday postni yuboring - Telegram, Instagram, Facebook yoki WhatsApp’dan: matn, izohli rasm yoki skrinshot.\n\nHadis ishonchlimi, zaifmi yoki toʻqimami - aytaman, manbalarni (Sunnah.com, Dorar, HadeethEnc) koʻrsataman va post ostiga qoʻyish mumkin boʻlgan yumshoq javobni postning oʻz tilida beraman.',
    tj: '🌙 <b>Hadith Verifier</b>\n\nБа ман ҳар гуна постеро, ки дар он ҳадис ҳаст, фиристед - аз Telegram, Instagram, Facebook ё WhatsApp: матн, акс бо тавзеҳ ё скриншот.\n\nМан мегӯям, ки ҳадис боэътимод аст, заиф ё сохта, манбаъҳоро (Sunnah.com, Dorar, HadeethEnc) нишон медиҳам ва ҷавоби нармеро бо забони худи пост пешниҳод мекунам, ки зери пост гузоштан мумкин аст.',
    ar: '🌙 <b>Hadith Verifier</b>\n\nأرسل إليّ أي منشور فيه حديث - من تيليجرام أو إنستغرام أو فيسبوك أو واتساب: نصًا أو صورة مع تعليق أو لقطة شاشة.\n\nسأخبرك هل الحديث ثابت أم ضعيف أم موضوع، وأعرض المصادر (Sunnah.com وDorar وHadeethEnc)، وأقترح ردًا لطيفًا بلغة المنشور نفسه يمكنك نشره تحته.',
  },
  langNote: {
    en: 'I always reply in the language of the post you send. If it has no text, in your Telegram language.',
    ru: 'Я всегда отвечаю на языке присланного поста. Если в нём нет текста - на языке вашего Telegram.',
    uz: 'Мен доим юборилган постнинг тилида жавоб бераман. Агар унда матн бўлмаса - Telegram’ингиз тилида.',
    uz_latin: 'Men doim yuborilgan postning tilida javob beraman. Agar unda matn boʻlmasa - Telegram’ingiz tilida.',
    tj: 'Ман ҳамеша бо забони пости фиристодашуда ҷавоб медиҳам. Агар дар он матн набошад - бо забони Telegram-и шумо.',
    ar: 'أرد دائمًا بلغة المنشور الذي ترسله. وإن لم يكن فيه نص، فبلغة تيليجرام لديك.',
  },
  checking: { en: '🔍 Checking…', ru: '🔍 Проверяю…', uz: '🔍 Текширяпман…', uz_latin: '🔍 Tekshiryapman…', tj: '🔍 Месанҷам…', ar: '🔍 جارٍ التحقق…' },
  tooShort: {
    en: 'Send the post\'s text (at least a sentence), a photo with a caption, or a screenshot.',
    ru: 'Пришлите текст поста (хотя бы одно предложение), фото с подписью или скриншот.',
    uz: 'Пост матнини (ҳеч бўлмаса бир жумла), изоҳли расм ёки скриншот юборинг.',
    uz_latin: 'Post matnini (hech boʻlmasa bir jumla), izohli rasm yoki skrinshot yuboring.',
    tj: 'Матни постро (ақаллан як ҷумла), акс бо тавзеҳ ё скриншот фиристед.',
    ar: 'أرسل نص المنشور (جملة على الأقل) أو صورة مع تعليق أو لقطة شاشة.',
  },
  noMedia: {
    en: 'I can\'t watch videos or open video links yet. Send the post\'s text or a screenshot of it.',
    ru: 'Видео и ссылки на видео я пока проверить не могу. Пришлите текст поста или его скриншот.',
    uz: 'Видео ва видео ҳаволаларини ҳозирча текшира олмайман. Пост матнини ёки скриншотини юборинг.',
    uz_latin: 'Video va video havolalarini hozircha tekshira olmayman. Post matnini yoki skrinshotini yuboring.',
    tj: 'Видео ва пайвандҳои видеоро ҳоло санҷида наметавонам. Матни пост ё скриншоти онро фиристед.',
    ar: 'لا أستطيع بعدُ فحص الفيديو أو روابط الفيديو. أرسل نص المنشور أو لقطة شاشة له.',
  },
  failed: {
    en: 'The check failed. Please try again in a minute.',
    ru: 'Проверка не удалась. Попробуйте через минуту.',
    uz: 'Текширув амалга ошмади. Бир дақиқадан кейин қайта уриниб кўринг.',
    uz_latin: 'Tekshiruv amalga oshmadi. Bir daqiqadan keyin qayta urinib koʻring.',
    tj: 'Санҷиш анҷом наёфт. Пас аз як дақиқа боз кӯшиш кунед.',
    ar: 'تعذّر الفحص. حاول مرة أخرى بعد دقيقة.',
  },
  userLimit: {
    en: 'That\'s 10 checks this hour. Please continue a little later, or on hadithverifier.com.',
    ru: 'Это уже 10 проверок за час. Продолжите чуть позже или на hadithverifier.com.',
    uz: 'Бир соатда 10 та текширув бўлди. Бироздан кейин давом этинг ёки hadithverifier.com’дан фойдаланинг.',
    uz_latin: 'Bir soatda 10 ta tekshiruv boʻldi. Birozdan keyin davom eting yoki hadithverifier.com’dan foydalaning.',
    tj: 'Дар як соат 10 санҷиш шуд. Каме баъдтар идома диҳед ё аз hadithverifier.com истифода баред.',
    ar: 'هذه 10 فحوص خلال ساعة. تابع بعد قليل أو استخدم hadithverifier.com.',
  },
  redFlags: { en: 'Red flags', ru: 'Тревожные признаки', uz: 'Шубҳали белгилар', uz_latin: 'Shubhali belgilar', tj: 'Аломатҳои шубҳанок', ar: 'علامات التحذير' },
  authenticAlt: { en: 'What the sources say', ru: 'Что говорят источники', uz: 'Манбалар нима дейди', uz_latin: 'Manbalar nima deydi', tj: 'Манбаъҳо чӣ мегӯянд', ar: 'ما تقوله المصادر' },
  sources: { en: 'Sources', ru: 'Источники', uz: 'Манбалар', uz_latin: 'Manbalar', tj: 'Манбаъҳо', ar: 'المصادر' },
  comment: {
    en: 'Reply you can paste under the post (tap to copy):',
    ru: 'Ответ, который можно вставить под пост (нажмите, чтобы скопировать):',
    uz: 'Пост остига қўйиш мумкин бўлган жавоб (нусха олиш учун босинг):',
    uz_latin: 'Post ostiga qoʻyish mumkin boʻlgan javob (nusxa olish uchun bosing):',
    tj: 'Ҷавобе, ки зери пост гузоштан мумкин аст (барои нусха гирифтан пахш кунед):',
    ar: 'رد يمكنك نشره تحت المنشور (اضغط للنسخ):',
  },
  notFatwa: {
    en: 'This is an automated check, not a fatwa. For a ruling, ask a qualified scholar.',
    ru: 'Это автоматическая проверка, а не фетва. За решением обращайтесь к знающему учёному.',
    uz: 'Бу автоматик текширув, фатво эмас. Ҳукм учун илмли уламога мурожаат қилинг.',
    uz_latin: 'Bu avtomatik tekshiruv, fatvo emas. Hukm uchun ilmli ulamoga murojaat qiling.',
    tj: 'Ин санҷиши худкор аст, на фатво. Барои ҳукм ба олими босалоҳият муроҷиат кунед.',
    ar: 'هذا فحص آلي وليس فتوى. للحكم الشرعي اسأل عالمًا مؤهلًا.',
  },
}

export const VERDICT_LABEL: Record<string, T6> = {
  fabricated: { en: 'Fabricated', ru: 'Выдуманный (мавду‘)', uz: 'Тўқима (мавзуъ)', uz_latin: 'Toʻqima (mavzuʼ)', tj: 'Сохта (мавзӯъ)', ar: 'موضوع' },
  weak: { en: 'Weak', ru: 'Слабый (да‘иф)', uz: 'Заиф', uz_latin: 'Zaif', tj: 'Заиф', ar: 'ضعيف' },
  authentic: { en: 'Authentic', ru: 'Достоверный', uz: 'Ишончли', uz_latin: 'Ishonchli', tj: 'Боэътимод', ar: 'ثابت' },
  unclear: { en: 'Needs checking', ru: 'Требует проверки', uz: 'Текширишни талаб қилади', uz_latin: 'Tekshirishni talab qiladi', tj: 'Санҷишро талаб мекунад', ar: 'يحتاج إلى تحقق' },
  no_hadith: { en: 'No hadith found', ru: 'Хадис не найден', uz: 'Ҳадис топилмади', uz_latin: 'Hadis topilmadi', tj: 'Ҳадис ёфт нашуд', ar: 'لم يُعثر على حديث' },
}
const VERDICT_EMOJI: Record<string, string> = { fabricated: '❌', weak: '⚠️', authentic: '✅', unclear: '🔍', no_hadith: 'ℹ️' }

export const ui = (key: string, lang: BotLang) => UI[key][lang] || UI[key].en

export function welcomeText(lang: BotLang): string {
  return `${ui('welcome', lang)}\n\nhadithverifier.com`
}

/** P399: the welcome for a Telegram app in English or any language the bot does not speak.
 *  The audience is in Russia and Central Asia but many phones run English, so the first
 *  screen speaks all four of the bot's main languages. */
export function welcomeMulti(): string {
  return [
    '🌙 <b>Hadith Verifier</b>',
    '',
    '🇷🇺 Перешлите пост с хадисом (текст, фото с подписью или скриншот) - скажу, достоверный он, слабый или выдуманный, с источниками и готовым ответом под пост.',
    '',
    '🇺🇿 Ҳадисли постни юборинг (матн, изоҳли расм ёки скриншот) - ишончлими, заифми ёки тўқимами, манбалари ва пост остига жавоб билан айтаман.',
    '',
    '🇹🇯 Постро бо ҳадис фиристед (матн, акс бо тавзеҳ ё скриншот) - мегӯям, ки боэътимод аст, заиф ё сохта, бо манбаъҳо ва ҷавоб барои зери пост.',
    '',
    '🇬🇧 Forward a post with a hadith (text, a photo with a caption, or a screenshot) - I\'ll tell you if it is authentic, weak or fabricated, with sources and a reply to paste under the post.',
    '',
    'hadithverifier.com',
  ].join('\n')
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;')

/** The analysis as HTML blocks, each valid on its own, every model string escaped. PURE. */
export function formatBlocks(result: any, lang: BotLang): string[] {
  const verdict = result?.verdict || 'unclear'
  const label = (VERDICT_LABEL[verdict] || VERDICT_LABEL.unclear)[lang]
  const blocks = [`${VERDICT_EMOJI[verdict] || '🔍'} <b>${esc(label)}</b>\n\n<b>${esc(result?.claim_summary)}</b>\n${esc(result?.analysis)}`]
  const flags = (result?.red_flags || []).map((f: unknown) => String(f ?? '').trim()).filter(Boolean)
  if (flags.length) blocks.push(`🚩 <b>${ui('redFlags', lang)}</b>\n${flags.map((f: string) => '• ' + esc(f)).join('\n')}`)
  if (result?.authentic_alternative) blocks.push(`📖 <b>${ui('authenticAlt', lang)}</b>\n${esc(result.authentic_alternative)}`)
  const refs = (result?.references || []).map((r: any) => {
    const url = String(r?.url || '')
    const name = esc(r?.source || url)
    let line = /^https?:\/\//.test(url) ? `• <a href="${escAttr(url)}">${name}</a>` : `• ${name}`
    if (r?.description) line += ' - ' + esc(r.description)
    return line
  })
  if (refs.length) blocks.push(`🔗 <b>${ui('sources', lang)}</b>\n${refs.join('\n')}`)
  if (result?.suggested_comment) blocks.push(`💬 ${ui('comment', lang)}\n<code>${esc(result.suggested_comment)}</code>`)
  blocks.push(`<i>${ui('notFatwa', lang)}</i>\nhadithverifier.com`)
  return blocks
}

export const TELEGRAM_LIMIT = 4000

/** Blocks -> messages under Telegram's limit, never splitting a block (that could cut an
 *  HTML tag). A block alone over the limit is cut as plain text. PURE. */
export function pack(blocks: string[], limit = TELEGRAM_LIMIT): string[] {
  const out: string[] = []
  let cur = ''
  for (let b of blocks) {
    if (b.length > limit) {
      const plain = b.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      let n = limit - 40
      do { b = esc(plain.slice(0, n)) + ' …'; n -= 200 } while (b.length > limit && n > 0)
    }
    if (cur && cur.length + 2 + b.length > limit) { out.push(cur); cur = b }
    else cur = cur ? cur + '\n\n' + b : b
  }
  if (cur) out.push(cur)
  return out
}
