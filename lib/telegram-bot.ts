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
const TIKTOK_LINK = /https?:\/\/(?:(?:www|m|vm|vt)\.)?tiktok\.com\/\S+/i
export const MIN_TEXT = 10

/** The first TikTok link in the text, or null. PURE. */
export function findTikTokUrl(text: string | null | undefined): string | null {
  const m = (text || '').match(TIKTOK_LINK)
  return m ? m[0].replace(/[)\].,!?»"']+$/, '') : null
}

// P405: a video FILE is checked in full (speech + caption); a TikTok link by its caption
// (oEmbed); any other video link gets "send the video itself or a screenshot" - no scraping
// (REEL_LINK_CHECK.md, operator 2026-11-11).
export type InputKind = 'image' | 'video' | 'text' | 'tiktok_link' | 'other_link' | 'too_short'
export function classifyInput(text: string, hasImage: boolean, hasVideo: boolean): InputKind {
  const t = (text || '').trim()
  if (hasImage) return 'image'
  if (hasVideo) return 'video'
  if (findTikTokUrl(t)) return 'tiktok_link'
  if (t.replace(VIDEO_LINK, '').trim().length >= MIN_TEXT) return 'text'
  if (new RegExp(VIDEO_LINK.source, 'i').test(t)) return 'other_link'
  return 'too_short'
}

/** Scribe's language_code (ISO 639-3, sometimes 639-1) -> a reply language, or null. PURE. */
export function scribeLang(code: string | null | undefined): BotLang | null {
  const c = (code || '').toLowerCase()
  return ({ rus: 'ru', ru: 'ru', uzb: 'uz', uz: 'uz', tgk: 'tj', tg: 'tj', ara: 'ar', ar: 'ar', eng: 'en', en: 'en' } as Record<string, BotLang>)[c] || null
}

/** What the model is given for a video: the caption and the words spoken, labelled. PURE. */
export function videoPostText(caption: string, transcript: string): string {
  const parts: string[] = []
  if (caption.trim()) parts.push(`Caption of the video:\n${caption.trim()}`)
  if (transcript.trim()) parts.push(`Spoken in the video (automatic transcript, may contain recognition errors):\n${transcript.trim()}`)
  return parts.join('\n\n')
}

export const TRANSCRIPT_SHOWN = 800

type T6 = Record<BotLang, string>
export const UI: Record<string, T6> = {
  welcome: {
    en: '🌙 <b>Hadith Verifier</b>\n\nForward me any post with a hadith - from Telegram, Instagram, Facebook or WhatsApp: the text, a photo with a caption, a screenshot or the video itself (up to 20 MB).\n\nI\'ll tell you whether the hadith is authentic, weak or fabricated, show the sources (Sunnah.com, Dorar, HadeethEnc) and give you a gentle reply you can paste under the post - in the language of the post.',
    ru: '🌙 <b>Hadith Verifier</b>\n\nПерешлите мне любой пост с хадисом - из Telegram, Instagram, Facebook или WhatsApp: текст, фото с подписью, скриншот или само видео (до 20 МБ).\n\nЯ скажу, достоверный хадис, слабый или выдуманный, покажу источники (Sunnah.com, Dorar, HadeethEnc) и дам мягкий ответ, который можно вставить под пост, - на языке самого поста.',
    uz: '🌙 <b>Hadith Verifier</b>\n\nМенга ҳадис бор ҳар қандай постни юборинг - Telegram, Instagram, Facebook ёки WhatsApp’дан: матн, изоҳли расм, скриншот ёки видеонинг ўзини (20 МБ гача).\n\nҲадис ишончлими, заифми ёки тўқимами - айтаман, манбаларни (Sunnah.com, Dorar, HadeethEnc) кўрсатаман ва пост остига қўйиш мумкин бўлган юмшоқ жавобни постнинг ўз тилида бераман.',
    uz_latin: '🌙 <b>Hadith Verifier</b>\n\nMenga hadis bor har qanday postni yuboring - Telegram, Instagram, Facebook yoki WhatsApp’dan: matn, izohli rasm, skrinshot yoki videoning oʻzini (20 MB gacha).\n\nHadis ishonchlimi, zaifmi yoki toʻqimami - aytaman, manbalarni (Sunnah.com, Dorar, HadeethEnc) koʻrsataman va post ostiga qoʻyish mumkin boʻlgan yumshoq javobni postning oʻz tilida beraman.',
    tj: '🌙 <b>Hadith Verifier</b>\n\nБа ман ҳар гуна постеро, ки дар он ҳадис ҳаст, фиристед - аз Telegram, Instagram, Facebook ё WhatsApp: матн, акс бо тавзеҳ, скриншот ё худи видео (то 20 МБ).\n\nМан мегӯям, ки ҳадис боэътимод аст, заиф ё сохта, манбаъҳоро (Sunnah.com, Dorar, HadeethEnc) нишон медиҳам ва ҷавоби нармеро бо забони худи пост пешниҳод мекунам, ки зери пост гузоштан мумкин аст.',
    ar: '🌙 <b>Hadith Verifier</b>\n\nأرسل إليّ أي منشور فيه حديث - من تيليجرام أو إنستغرام أو فيسبوك أو واتساب: نصًا أو صورة مع تعليق أو لقطة شاشة أو الفيديو نفسه (حتى 20 ميغابايت).\n\nسأخبرك هل الحديث ثابت أم ضعيف أم موضوع، وأعرض المصادر (Sunnah.com وDorar وHadeethEnc)، وأقترح ردًا لطيفًا بلغة المنشور نفسه يمكنك نشره تحته.',
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
  otherLink: {
    en: 'I can\'t open Instagram, YouTube or Facebook links. Save the video and send it to me as a file (up to 20 MB) - I\'ll check what is said in it - or send a screenshot or the post\'s text.',
    ru: 'Ссылки Instagram, YouTube и Facebook я открыть не могу. Сохраните видео и пришлите мне файлом (до 20 МБ) - я проверю, что в нём говорится, - или пришлите скриншот или текст поста.',
    uz: 'Instagram, YouTube ва Facebook ҳаволаларини оча олмайман. Видеони сақлаб, менга файл қилиб юборинг (20 МБ гача) - унда айтилганини текшираман - ёки скриншот ё пост матнини юборинг.',
    uz_latin: 'Instagram, YouTube va Facebook havolalarini ocha olmayman. Videoni saqlab, menga fayl qilib yuboring (20 MB gacha) - unda aytilganini tekshiraman - yoki skrinshot yo post matnini yuboring.',
    tj: 'Пайвандҳои Instagram, YouTube ва Facebook-ро кушода наметавонам. Видеоро нигоҳ дошта, ба ман ҳамчун файл фиристед (то 20 МБ) - он чиро, ки дар он гуфта мешавад, месанҷам - ё скриншот ё матни постро фиристед.',
    ar: 'لا أستطيع فتح روابط إنستغرام أو يوتيوب أو فيسبوك. احفظ الفيديو وأرسله إليّ كملف (حتى 20 ميغابايت) - وسأفحص ما يُقال فيه - أو أرسل لقطة شاشة أو نص المنشور.',
  },
  videoTooLarge: {
    en: 'This video is over 20 MB - Telegram does not let bots download larger files. Send a shorter clip, a screenshot or the post\'s text.',
    ru: 'Видео больше 20 МБ - Telegram не даёт ботам скачивать файлы крупнее. Пришлите фрагмент покороче, скриншот или текст поста.',
    uz: 'Видео 20 МБ дан катта - Telegram ботларга бундан катта файлни юклаб олишга рухсат бермайди. Қисқароқ парча, скриншот ёки пост матнини юборинг.',
    uz_latin: 'Video 20 MB dan katta - Telegram botlarga bundan katta faylni yuklab olishga ruxsat bermaydi. Qisqaroq parcha, skrinshot yoki post matnini yuboring.',
    tj: 'Видео аз 20 МБ калонтар аст - Telegram ба ботҳо иҷозат намедиҳад, ки файлҳои калонтарро боргирӣ кунанд. Пораи кӯтоҳтар, скриншот ё матни постро фиристед.',
    ar: 'حجم الفيديو أكبر من 20 ميغابايت - ولا يسمح تيليجرام للبوتات بتنزيل ملفات أكبر. أرسل مقطعًا أقصر أو لقطة شاشة أو نص المنشور.',
  },
  videoUserLimit: {
    en: 'That\'s 3 video checks today - the free limit for now. Texts and screenshots can still be checked.',
    ru: 'Сегодня уже 3 проверки видео - пока это бесплатный лимит. Текст и скриншоты по-прежнему можно проверить.',
    uz: 'Бугун 3 та видео текширилди - ҳозирча бепул лимит шу. Матн ва скриншотларни ҳали ҳам текшириш мумкин.',
    uz_latin: 'Bugun 3 ta video tekshirildi - hozircha bepul limit shu. Matn va skrinshotlarni hali ham tekshirish mumkin.',
    tj: 'Имрӯз 3 видео санҷида шуд - ҳоло ин лимити ройгон аст. Матн ва скриншотҳоро ҳанӯз санҷидан мумкин аст.',
    ar: 'هذه 3 فحوص فيديو اليوم - وهو الحد المجاني حاليًا. لا يزال بإمكانك فحص النصوص ولقطات الشاشة.',
  },
  videoDailyLimit: {
    en: 'Today\'s video limit is used up. Send the text or a screenshot.',
    ru: 'Дневной лимит проверки видео исчерпан. Пришлите текст или скриншот.',
    uz: 'Бугунги видео лимити тугади. Матн ёки скриншот юборинг.',
    uz_latin: 'Bugungi video limiti tugadi. Matn yoki skrinshot yuboring.',
    tj: 'Лимити видеои имрӯза ба охир расид. Матн ё скриншот фиристед.',
    ar: 'انتهى حد فحص الفيديو لليوم. أرسل النص أو لقطة شاشة.',
  },
  noSpeech: {
    en: 'I couldn\'t hear any speech in this video, and it has no caption to check. Send a screenshot or the post\'s text.',
    ru: 'В этом видео я не расслышал речи, и подписи к нему нет. Пришлите скриншот или текст поста.',
    uz: 'Бу видеода нутқ эшитилмади, изоҳи ҳам йўқ. Скриншот ёки пост матнини юборинг.',
    uz_latin: 'Bu videoda nutq eshitilmadi, izohi ham yoʻq. Skrinshot yoki post matnini yuboring.',
    tj: 'Дар ин видео сухане шунида нашуд ва тавзеҳ ҳам надорад. Скриншот ё матни постро фиристед.',
    ar: 'لم أسمع كلامًا في هذا الفيديو، وليس له تعليق يمكن فحصه. أرسل لقطة شاشة أو نص المنشور.',
  },
  transcript: {
    en: 'What I heard (automatic transcript, may contain errors)',
    ru: 'Что я услышал (автоматическая расшифровка, возможны ошибки)',
    uz: 'Эшитганим (автоматик ёзиб олинган, хатолар бўлиши мумкин)',
    uz_latin: 'Eshitganim (avtomatik yozib olingan, xatolar boʻlishi mumkin)',
    tj: 'Он чи шунидам (матни худкор, метавонад хато дошта бошад)',
    ar: 'ما سمعته (تفريغ آلي، قد يحتوي على أخطاء)',
  },
  tiktokCaptionOnly: {
    en: 'Only the TikTok caption was checked, not what is said in the video. To check the speech, save the video and send it to me.',
    ru: 'Проверена только подпись к TikTok, а не то, что говорится в видео. Чтобы проверить речь, сохраните видео и пришлите мне.',
    uz: 'Фақат TikTok изоҳи текширилди, видеода айтилгани эмас. Нутқни текшириш учун видеони сақлаб, менга юборинг.',
    uz_latin: 'Faqat TikTok izohi tekshirildi, videoda aytilgani emas. Nutqni tekshirish uchun videoni saqlab, menga yuboring.',
    tj: 'Танҳо тавзеҳи TikTok санҷида шуд, на он чи дар видео гуфта мешавад. Барои санҷидани сухан видеоро нигоҳ дошта, ба ман фиристед.',
    ar: 'تم فحص تعليق تيك توك فقط، لا ما يُقال في الفيديو. لفحص الكلام احفظ الفيديو وأرسله إليّ.',
  },
  tiktokEmpty: {
    en: 'I couldn\'t find hadith text in this TikTok\'s caption, and from a link I can\'t hear the speech. Save the video and send it to me, or send a screenshot.',
    ru: 'В подписи к этому TikTok нет текста хадиса, а речь по ссылке я не слышу. Сохраните видео и пришлите мне или пришлите скриншот.',
    uz: 'Бу TikTok изоҳида ҳадис матни топилмади, ҳавола орқали эса нутқни эшита олмайман. Видеони сақлаб, менга юборинг ёки скриншот юборинг.',
    uz_latin: 'Bu TikTok izohida hadis matni topilmadi, havola orqali esa nutqni eshita olmayman. Videoni saqlab, menga yuboring yoki skrinshot yuboring.',
    tj: 'Дар тавзеҳи ин TikTok матни ҳадис ёфт нашуд, аз пайванд бошад суханро шунида наметавонам. Видеоро нигоҳ дошта, ба ман фиристед ё скриншот фиристед.',
    ar: 'لم أجد نص حديث في تعليق هذا المقطع على تيك توك، ولا أستطيع سماع الكلام من رابط. احفظ الفيديو وأرسله إليّ، أو أرسل لقطة شاشة.',
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
    '🇷🇺 Перешлите пост с хадисом (текст, фото с подписью, скриншот или видео) - скажу, достоверный он, слабый или выдуманный, с источниками и готовым ответом под пост.',
    '',
    '🇺🇿 Ҳадисли постни юборинг (матн, изоҳли расм, скриншот ёки видео) - ишончлими, заифми ёки тўқимами, манбалари ва пост остига жавоб билан айтаман.',
    '',
    '🇹🇯 Постро бо ҳадис фиристед (матн, акс бо тавзеҳ, скриншот ё видео) - мегӯям, ки боэътимод аст, заиф ё сохта, бо манбаъҳо ва ҷавоб барои зери пост.',
    '',
    '🇬🇧 Forward a post with a hadith (text, a photo with a caption, a screenshot or a video) - I\'ll tell you if it is authentic, weak or fabricated, with sources and a reply to paste under the post.',
    '',
    'hadithverifier.com',
  ].join('\n')
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;')

/** The analysis as HTML blocks, each valid on its own, every model string escaped. PURE. */
export function formatBlocks(result: any, lang: BotLang, extra: { transcript?: string; note?: string } = {}): string[] {
  const verdict = result?.verdict || 'unclear'
  const label = (VERDICT_LABEL[verdict] || VERDICT_LABEL.unclear)[lang]
  const blocks = [`${VERDICT_EMOJI[verdict] || '🔍'} <b>${esc(label)}</b>\n\n<b>${esc(result?.claim_summary)}</b>\n${esc(result?.analysis)}`]
  // P405: the transcript is shown, so the user sees what the check was run on
  const heard = (extra.transcript || '').trim()
  if (heard) {
    const shown = heard.length > TRANSCRIPT_SHOWN ? heard.slice(0, TRANSCRIPT_SHOWN).trimEnd() + ' …' : heard
    blocks.push(`🎙 <b>${ui('transcript', lang)}</b>\n<i>${esc(shown)}</i>`)
  }
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
  if (extra.note) blocks.push(`ℹ️ ${esc(extra.note)}`)
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
