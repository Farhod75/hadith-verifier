// ============================================================
// HADITH VERIFIER â€” Internationalization (i18n)
// App UI translations for EN, UZ Latin, UZ Cyrillic, RU, AR
// ============================================================

export type AppLang = 'en' | 'uz_latin' | 'uz_cyrillic' | 'ru' | 'ar' | 'tj'

export const APP_LANGUAGES = [
  { code: 'en' as AppLang, label: 'English', flag: 'ðŸ‡¬ðŸ‡§', dir: 'ltr' },
  { code: 'uz_latin' as AppLang, label: "O'zbek", flag: 'ðŸ‡ºðŸ‡¿', dir: 'ltr' },
  { code: 'uz_cyrillic' as AppLang, label: 'ÐŽÐ·Ð±ÐµÐº', flag: 'ðŸ‡ºðŸ‡¿', dir: 'ltr' },
  { code: 'ru' as AppLang, label: 'Ð ÑƒÑÑÐºÐ¸Ð¹', flag: 'ðŸ‡·ðŸ‡º', dir: 'ltr' },
  { code: 'ar' as AppLang, label: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©', flag: 'ðŸ‡¸ðŸ‡¦', dir: 'rtl' },
  { code: 'tj' as AppLang, label: 'Ð¢Ð¾Ò·Ð¸ÐºÓ£', flag: 'ðŸ‡¹ðŸ‡¯', dir: 'ltr' }, // â† add this
]

export type Translations = {
  // Header
  appName: string
  appSubtitle: string

  // Tabs
  tabAnalyze: string
  tabDua: string
  tabSources: string
  tabAdmin: string
  tabSearch: string

  // Stats
  statChecked: string
  statFlagged: string
  statAuthentic: string

  // Analyze tab
  pasteText: string
  uploadScreenshot: string
  pastePostContent: string
  postPlaceholder: string
  dragDrop: string
  tryLabel: string
  exampleFabricated: string
  exampleChain: string
  exampleAuthentic: string
  analyzePost: string
  analyzeScreenshot: string
  analyzing: string
  readingImage: string
  clear: string
  replyIn: string

  // Results
  extractedFromScreenshot: string
  highConfidence: string
  mediumConfidence: string
  lowConfidence: string
  redFlagsDetected: string
  authenticScholarshipSays: string
  verifiedSources: string
  readyToPost: string
  copyComment: string
  copied: string
  viewInAdminQueue: string

  // Verdict labels
  verdictFabricated: string
  verdictWeak: string
  verdictAuthentic: string
  verdictUnclear: string
  verdictNoHadith: string

  // Dua corrector
  duaCorrectorTitle: string
  duaCorrectorSubtitle: string
  duaPlaceholder: string
  exampleWrongOrder: string
  exampleArabicOnly: string
  exampleTransliteration: string
  checkDua: string
  checking: string
  errorsFound: string
  correctArabic: string
  copyArabic: string
  transliterations: string
  meaning: string
  correctionComments: string
  duaCorrect: string
  duaHasErrors: string
  duaUnknown: string
  source: string

  // Sources tab
  tier1Title: string
  tier2Title: string
  tier3Title: string
  sourceAuthorityNote: string

  // Admin tab
  flaggedPostsQueue: string
  refresh: string
  noFlaggedPosts: string
  adminPolicy: string
  copyBtn: string
  reportBtn: string
  dismissBtn: string
  reportInstruction: string

  // Remove image
  removeImage: string
}

const translations: Record<AppLang, Translations> = {
  en: {
    appName: 'Hadith Verifier',
    appSubtitle: 'Hadith authentication Â· Dua corrector Â· EN Â· UZ Â· AR Â· RU Â· TJ',
    tabAnalyze: 'Analyze post',
    tabDua: 'Dua corrector',
    tabSources: 'Sources',
    tabAdmin: 'Admin queue',
    tabSearch: 'Search',
    statChecked: 'Checked',
    statFlagged: 'Flagged',
    statAuthentic: 'Authentic',
    pasteText: 'Paste text',
    uploadScreenshot: 'Upload screenshot',
    pastePostContent: 'Paste post content',
    postPlaceholder: 'Paste Facebook, Instagram, or WhatsApp post text â€” any language (Uzbek, Arabic, Russian, English...)',
    dragDrop: 'Or drag & drop a screenshot Â· Click to browse',
    tryLabel: 'Try:',
    exampleFabricated: 'Fabricated (Uzbek)',
    exampleChain: 'Chain message',
    exampleAuthentic: 'Authentic',
    analyzePost: 'Analyze post',
    analyzeScreenshot: 'Analyze screenshot',
    analyzing: 'Analyzing...',
    readingImage: 'Reading image...',
    clear: 'Clear',
    replyIn: 'Reply in:',
    extractedFromScreenshot: 'Text extracted from screenshot',
    highConfidence: 'high confidence',
    mediumConfidence: 'medium confidence',
    lowConfidence: 'low confidence',
    redFlagsDetected: 'Red flags detected',
    authenticScholarshipSays: 'Authentic scholarship says',
    verifiedSources: 'Verified sources',
    readyToPost: 'Ready-to-post comment',
    copyComment: 'Copy comment',
    copied: 'Copied!',
    viewInAdminQueue: 'View in admin queue â†’',
    verdictFabricated: 'Fabricated hadith',
    verdictWeak: 'Weak / unverified',
    verdictAuthentic: 'Authentic',
    verdictUnclear: 'Needs verification',
    verdictNoHadith: 'No hadith found',
    duaCorrectorTitle: 'Dua corrector',
    duaCorrectorSubtitle: 'Checks Arabic word order, diacritics, and transliteration errors. Provides correct text in 4 scripts.',
    duaPlaceholder: 'Paste Arabic dua text, transliteration, or both â€” any script (Arabic, Cyrillic, Latin)...',
    exampleWrongOrder: 'Wrong order (like Reel)',
    exampleArabicOnly: 'Arabic only',
    exampleTransliteration: 'Transliteration',
    checkDua: 'Check dua',
    checking: 'Checking...',
    errorsFound: 'Errors found',
    correctArabic: 'Corrected Arabic with diacritics',
    copyArabic: 'Copy Arabic',
    transliterations: 'Transliterations â€” 4 scripts',
    meaning: 'Meaning / Translation',
    correctionComments: 'Ready-to-post correction comments',
    duaCorrect: 'Correct dua',
    duaHasErrors: 'Errors found',
    duaUnknown: 'Unknown dua',
    source: 'Source',
    tier1Title: 'Tier 1 â€” Primary collections (highest authority)',
    tier2Title: 'Tier 2 â€” Scholarly bodies',
    tier3Title: 'Tier 3 â€” Supporting sources',
    sourceAuthorityNote: 'AI is instructed to prioritize: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'Flagged posts queue',
    refresh: 'Refresh',
    noFlaggedPosts: 'No flagged posts yet. Analyze posts to populate the queue.',
    adminPolicy: 'Admin policy: AI flags, humans decide. Never auto-delete or auto-ban.',
    copyBtn: 'Copy',
    reportBtn: 'Report',
    dismissBtn: 'Dismiss',
    reportInstruction: 'Open Facebook â†’ find post â†’ 3 dots â†’ Report â†’ False information',
    removeImage: 'Remove',
  },

  uz_latin: {
    appName: 'Hadis Tekshiruvchi',
    appSubtitle: 'Hadis autentifikatsiyasi Â· Duo tuzatuvchi Â· UZ Â· RU Â· AR Â· EN Â· TJ',
    tabAnalyze: 'Postni tahlil qilish',
    tabDua: 'Duo tuzatuvchi',
    tabSources: 'Manbalar',
    tabAdmin: 'Admin navbati',
    tabSearch: 'Qidiruv',
    statChecked: 'Tekshirildi',
    statFlagged: 'Belgilandi',
    statAuthentic: 'Sahih',
    pasteText: 'Matn joylashtiring',
    uploadScreenshot: 'Skrinshot yuklang',
    pastePostContent: 'Post matnini joylashtiring',
    postPlaceholder: 'Facebook, Instagram yoki WhatsApp post matnini joylashtiring â€” istalgan tilda (oÊ»zbekcha, arabcha, ruscha, inglizcha...)',
    dragDrop: 'Yoki skrinshotni shu yerga tashlang Â· KoÊ»rish uchun bosing',
    tryLabel: 'Sinab koÊ»ring:',
    exampleFabricated: 'Uydirma (oÊ»zbekcha)',
    exampleChain: 'Zanjir xabar',
    exampleAuthentic: 'Sahih hadis',
    analyzePost: 'Postni tahlil qilish',
    analyzeScreenshot: 'Skrinshotni tahlil qilish',
    analyzing: 'Tahlil qilinmoqda...',
    readingImage: 'Rasm oÊ»qilmoqda...',
    clear: 'Tozalash',
    replyIn: 'Javob tili:',
    extractedFromScreenshot: 'Skrinshotdan ajratib olingan matn',
    highConfidence: 'yuqori ishonchlilik',
    mediumConfidence: "o'rtacha ishonchlilik",
    lowConfidence: 'past ishonchlilik',
    redFlagsDetected: 'Xavf belgilari aniqlandi',
    authenticScholarshipSays: 'Sahih ilm nima deydi',
    verifiedSources: 'Tasdiqlangan manbalar',
    readyToPost: 'Joylashtirga tayyor izoh',
    copyComment: 'Izohni nusxalash',
    copied: 'Nusxalandi!',
    viewInAdminQueue: 'Admin navbatida koÊ»rish â†’',
    verdictFabricated: 'Uydirma hadis',
    verdictWeak: 'Zaif / tasdiqlanmagan',
    verdictAuthentic: 'Sahih',
    verdictUnclear: 'Tekshirish kerak',
    verdictNoHadith: 'Hadis topilmadi',
    duaCorrectorTitle: 'Duo tuzatuvchi',
    duaCorrectorSubtitle: 'Arabcha soÊ»zlar tartibini, harakat belgilarini va transkripsiya xatolarini tekshiradi.',
    duaPlaceholder: 'Arabcha duo matnini yoki transkriptsiyasini joylashtiring...',
    exampleWrongOrder: 'NotoÊ»gÊ»ri tartib (Reel kabi)',
    exampleArabicOnly: 'Faqat arabcha',
    exampleTransliteration: 'Transkriptsiya',
    checkDua: 'Duoni tekshirish',
    checking: 'Tekshirilmoqda...',
    errorsFound: 'Xatolar topildi',
    correctArabic: 'Tuzatilgan arabcha (harakat belgilari bilan)',
    copyArabic: 'Arabchani nusxalash',
    transliterations: 'Transkriptsiyalar â€” 4 yozuv',
    meaning: 'MaÊ¼no / Tarjima',
    correctionComments: 'Tuzatish izohlari',
    duaCorrect: 'ToÊ»gÊ»ri duo',
    duaHasErrors: 'Xatolar bor',
    duaUnknown: 'NomaÊ¼lum duo',
    source: 'Manba',
    tier1Title: '1-daraja â€” Asosiy toÊ»plamlar (eng yuqori obro\')',
    tier2Title: '2-daraja â€” Olimlik fatvo organlari',
    tier3Title: '3-daraja â€” QoÊ»shimcha manbalar',
    sourceAuthorityNote: 'Sun\'iy intellekt quyidagi tartibda tekshiradi: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'Belgilangan postlar navbati',
    refresh: 'Yangilash',
    noFlaggedPosts: 'Hali belgilangan postlar yoÊ»q.',
    adminPolicy: 'Admin siyosati: Sun\'iy intellekt belgilaydi, odamlar qaror qiladi.',
    copyBtn: 'Nusxalash',
    reportBtn: 'Shikoyat',
    dismissBtn: 'OÊ»tkazib yuborish',
    reportInstruction: 'Facebookni oching â†’ postni toping â†’ 3 nuqta â†’ Shikoyat â†’ YolgÊ»on maÊ¼lumot',
    removeImage: 'OÊ»chirish',
    
  },

  uz_cyrillic: {
    appName: 'Ò²Ð°Ð´Ð¸Ñ Ð¢ÐµÐºÑˆÐ¸Ñ€ÑƒÐ²Ñ‡Ð¸',
    appSubtitle: 'Ò²Ð°Ð´Ð¸Ñ Ð°ÑƒÑ‚ÐµÐ½Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ†Ð¸ÑÑÐ¸ Â· Ð”ÑƒÐ¾ Ñ‚ÑƒÐ·Ð°Ñ‚ÑƒÐ²Ñ‡Ð¸ Â· ÐŽÐ— Â· Ð Ð£ Â· ÐÐ  Â· Ð˜Ð Â· Ð¢Ð–',
    tabAnalyze: 'ÐŸÐ¾ÑÑ‚Ð½Ð¸ Ñ‚Ð°Ò³Ð»Ð¸Ð» Ò›Ð¸Ð»Ð¸Ñˆ',
    tabDua: 'Ð”ÑƒÐ¾ Ñ‚ÑƒÐ·Ð°Ñ‚ÑƒÐ²Ñ‡Ð¸',
    tabSources: 'ÐœÐ°Ð½Ð±Ð°Ð»Ð°Ñ€',
    tabAdmin: 'ÐÐ´Ð¼Ð¸Ð½ Ð½Ð°Ð²Ð±Ð°Ñ‚Ð¸',
    tabSearch: 'Қидирув',
    statChecked: 'Ð¢ÐµÐºÑˆÐ¸Ñ€Ð¸Ð»Ð´Ð¸',
    statFlagged: 'Ð‘ÐµÐ»Ð³Ð¸Ð»Ð°Ð½Ð´Ð¸',
    statAuthentic: 'Ð¡Ð°Ò³Ð¸Ò³',
    pasteText: 'ÐœÐ°Ñ‚Ð½ Ð¶Ð¾Ð¹Ð»Ð°ÑˆÑ‚Ð¸Ñ€Ð¸Ð½Ð³',
    uploadScreenshot: 'Ð¡ÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚ ÑŽÐºÐ»Ð°Ð½Ð³',
    pastePostContent: 'ÐŸÐ¾ÑÑ‚ Ð¼Ð°Ñ‚Ð½Ð¸Ð½Ð¸ Ð¶Ð¾Ð¹Ð»Ð°ÑˆÑ‚Ð¸Ñ€Ð¸Ð½Ð³',
    postPlaceholder: 'Facebook, Instagram Ñ‘ÐºÐ¸ WhatsApp Ð¿Ð¾ÑÑ‚ Ð¼Ð°Ñ‚Ð½Ð¸Ð½Ð¸ Ð¶Ð¾Ð¹Ð»Ð°ÑˆÑ‚Ð¸Ñ€Ð¸Ð½Ð³ â€” Ð¸ÑÑ‚Ð°Ð»Ð³Ð°Ð½ Ñ‚Ð¸Ð»Ð´Ð° (ÑžÐ·Ð±ÐµÐºÑ‡Ð°, Ð°Ñ€Ð°Ð±Ñ‡Ð°, Ñ€ÑƒÑÑ‡Ð°, Ð¸Ð½Ð³Ð»Ð¸Ð·Ñ‡Ð°...)',
    dragDrop: 'ÐÐºÐ¸ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ð½Ð¸ ÑˆÑƒ ÐµÑ€Ð³Ð° Ñ‚Ð°ÑˆÐ»Ð°Ð½Ð³ Â· ÐšÑžÑ€Ð¸Ñˆ ÑƒÑ‡ÑƒÐ½ Ð±Ð¾ÑÐ¸Ð½Ð³',
    tryLabel: 'Ð¡Ð¸Ð½Ð°Ð± ÐºÑžÑ€Ð¸Ð½Ð³:',
    exampleFabricated: 'Ð£Ð¹Ð´Ð¸Ñ€Ð¼Ð° (ÑžÐ·Ð±ÐµÐºÑ‡Ð°)',
    exampleChain: 'Ð—Ð°Ð½Ð¶Ð¸Ñ€ Ñ…Ð°Ð±Ð°Ñ€',
    exampleAuthentic: 'Ð¡Ð°Ò³Ð¸Ò³ Ò³Ð°Ð´Ð¸Ñ',
    analyzePost: 'ÐŸÐ¾ÑÑ‚Ð½Ð¸ Ñ‚Ð°Ò³Ð»Ð¸Ð» Ò›Ð¸Ð»Ð¸Ñˆ',
    analyzeScreenshot: 'Ð¡ÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ð½Ð¸ Ñ‚Ð°Ò³Ð»Ð¸Ð» Ò›Ð¸Ð»Ð¸Ñˆ',
    analyzing: 'Ð¢Ð°Ò³Ð»Ð¸Ð» Ò›Ð¸Ð»Ð¸Ð½Ð¼Ð¾Ò›Ð´Ð°...',
    readingImage: 'Ð Ð°ÑÐ¼ ÑžÒ›Ð¸Ð»Ð¼Ð¾Ò›Ð´Ð°...',
    clear: 'Ð¢Ð¾Ð·Ð°Ð»Ð°Ñˆ',
    replyIn: 'Ð–Ð°Ð²Ð¾Ð± Ñ‚Ð¸Ð»Ð¸:',
    extractedFromScreenshot: 'Ð¡ÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ð´Ð°Ð½ Ð°Ð¶Ñ€Ð°Ñ‚Ð¸Ð± Ð¾Ð»Ð¸Ð½Ð³Ð°Ð½ Ð¼Ð°Ñ‚Ð½',
    highConfidence: 'ÑŽÒ›Ð¾Ñ€Ð¸ Ð¸ÑˆÐ¾Ð½Ñ‡Ð»Ð¸Ð»Ð¸Ðº',
    mediumConfidence: 'ÑžÑ€Ñ‚Ð°Ñ‡Ð° Ð¸ÑˆÐ¾Ð½Ñ‡Ð»Ð¸Ð»Ð¸Ðº',
    lowConfidence: 'Ð¿Ð°ÑÑ‚ Ð¸ÑˆÐ¾Ð½Ñ‡Ð»Ð¸Ð»Ð¸Ðº',
    redFlagsDetected: 'Ð¥Ð°Ð²Ñ„ Ð±ÐµÐ»Ð³Ð¸Ð»Ð°Ñ€Ð¸ Ð°Ð½Ð¸Ò›Ð»Ð°Ð½Ð´Ð¸',
    authenticScholarshipSays: 'Ð¡Ð°Ò³Ð¸Ò³ Ð¸Ð»Ð¼ Ð½Ð¸Ð¼Ð° Ð´ÐµÐ¹Ð´Ð¸',
    verifiedSources: 'Ð¢Ð°ÑÐ´Ð¸Ò›Ð»Ð°Ð½Ð³Ð°Ð½ Ð¼Ð°Ð½Ð±Ð°Ð»Ð°Ñ€',
    readyToPost: 'Ð–Ð¾Ð¹Ð»Ð°ÑˆÑ‚Ð¸Ñ€Ð³Ð° Ñ‚Ð°Ð¹Ñ‘Ñ€ Ð¸Ð·Ð¾Ò³',
    copyComment: 'Ð˜Ð·Ð¾Ò³Ð½Ð¸ Ð½ÑƒÑÑ…Ð°Ð»Ð°Ñˆ',
    copied: 'ÐÑƒÑÑ…Ð°Ð»Ð°Ð½Ð´Ð¸!',
    viewInAdminQueue: 'ÐÐ´Ð¼Ð¸Ð½ Ð½Ð°Ð²Ð±Ð°Ñ‚Ð¸Ð´Ð° ÐºÑžÑ€Ð¸Ñˆ â†’',
    verdictFabricated: 'Ð£Ð¹Ð´Ð¸Ñ€Ð¼Ð° Ò³Ð°Ð´Ð¸Ñ',
    verdictWeak: 'Ð—Ð°Ð¸Ñ„ / Ñ‚Ð°ÑÐ´Ð¸Ò›Ð»Ð°Ð½Ð¼Ð°Ð³Ð°Ð½',
    verdictAuthentic: 'Ð¡Ð°Ò³Ð¸Ò³',
    verdictUnclear: 'Ð¢ÐµÐºÑˆÐ¸Ñ€Ð¸Ñˆ ÐºÐµÑ€Ð°Ðº',
    verdictNoHadith: 'Ò²Ð°Ð´Ð¸Ñ Ñ‚Ð¾Ð¿Ð¸Ð»Ð¼Ð°Ð´Ð¸',
    duaCorrectorTitle: 'Ð”ÑƒÐ¾ Ñ‚ÑƒÐ·Ð°Ñ‚ÑƒÐ²Ñ‡Ð¸',
    duaCorrectorSubtitle: 'ÐÑ€Ð°Ð±Ñ‡Ð° ÑÑžÐ·Ð»Ð°Ñ€ Ñ‚Ð°Ñ€Ñ‚Ð¸Ð±Ð¸Ð½Ð¸, Ò³Ð°Ñ€Ð°ÐºÐ°Ñ‚ Ð±ÐµÐ»Ð³Ð¸Ð»Ð°Ñ€Ð¸Ð½Ð¸ Ð²Ð° Ñ‚Ñ€Ð°Ð½ÑÐºÑ€Ð¸Ð¿Ñ†Ð¸Ñ Ñ…Ð°Ñ‚Ð¾Ð»Ð°Ñ€Ð¸Ð½Ð¸ Ñ‚ÐµÐºÑˆÐ¸Ñ€Ð°Ð´Ð¸.',
    duaPlaceholder: 'ÐÑ€Ð°Ð±Ñ‡Ð° Ð´ÑƒÐ¾ Ð¼Ð°Ñ‚Ð½Ð¸Ð½Ð¸ Ñ‘ÐºÐ¸ Ñ‚Ñ€Ð°Ð½ÑÐºÑ€Ð¸Ð¿Ñ†Ð¸ÑÑÐ¸Ð½Ð¸ Ð¶Ð¾Ð¹Ð»Ð°ÑˆÑ‚Ð¸Ñ€Ð¸Ð½Ð³...',
    exampleWrongOrder: 'ÐÐ¾Ñ‚ÑžÒ“Ñ€Ð¸ Ñ‚Ð°Ñ€Ñ‚Ð¸Ð± (Reel ÐºÐ°Ð±Ð¸)',
    exampleArabicOnly: 'Ð¤Ð°Ò›Ð°Ñ‚ Ð°Ñ€Ð°Ð±Ñ‡Ð°',
    exampleTransliteration: 'Ð¢Ñ€Ð°Ð½ÑÐºÑ€Ð¸Ð¿Ñ†Ð¸Ñ',
    checkDua: 'Ð”ÑƒÐ¾Ð½Ð¸ Ñ‚ÐµÐºÑˆÐ¸Ñ€Ð¸Ñˆ',
    checking: 'Ð¢ÐµÐºÑˆÐ¸Ñ€Ð¸Ð»Ð¼Ð¾Ò›Ð´Ð°...',
    errorsFound: 'Ð¥Ð°Ñ‚Ð¾Ð»Ð°Ñ€ Ñ‚Ð¾Ð¿Ð¸Ð»Ð´Ð¸',
    correctArabic: 'Ð¢ÑƒÐ·Ð°Ñ‚Ð¸Ð»Ð³Ð°Ð½ Ð°Ñ€Ð°Ð±Ñ‡Ð° (Ò³Ð°Ñ€Ð°ÐºÐ°Ñ‚ Ð±ÐµÐ»Ð³Ð¸Ð»Ð°Ñ€Ð¸ Ð±Ð¸Ð»Ð°Ð½)',
    copyArabic: 'ÐÑ€Ð°Ð±Ñ‡Ð°Ð½Ð¸ Ð½ÑƒÑÑ…Ð°Ð»Ð°Ñˆ',
    transliterations: 'Ð¢Ñ€Ð°Ð½ÑÐºÑ€Ð¸Ð¿Ñ†Ð¸ÑÐ»Ð°Ñ€ â€” 4 Ñ‘Ð·ÑƒÐ²',
    meaning: 'ÐœÐ°ÑŠÐ½Ð¾ / Ð¢Ð°Ñ€Ð¶Ð¸Ð¼Ð°',
    correctionComments: 'Ð¢ÑƒÐ·Ð°Ñ‚Ð¸Ñˆ Ð¸Ð·Ð¾Ò³Ð»Ð°Ñ€Ð¸',
    duaCorrect: 'Ð¢ÑžÒ“Ñ€Ð¸ Ð´ÑƒÐ¾',
    duaHasErrors: 'Ð¥Ð°Ñ‚Ð¾Ð»Ð°Ñ€ Ð±Ð¾Ñ€',
    duaUnknown: 'ÐÐ¾Ð¼Ð°ÑŠÐ»ÑƒÐ¼ Ð´ÑƒÐ¾',
    source: 'ÐœÐ°Ð½Ð±Ð°',
    tier1Title: '1-Ð´Ð°Ñ€Ð°Ð¶Ð° â€” ÐÑÐ¾ÑÐ¸Ð¹ Ñ‚ÑžÐ¿Ð»Ð°Ð¼Ð»Ð°Ñ€',
    tier2Title: '2-Ð´Ð°Ñ€Ð°Ð¶Ð° â€” ÐžÐ»Ð¸Ð¼Ð»Ð¸Ðº Ñ„Ð°Ñ‚Ð²Ð¾ Ð¾Ñ€Ð³Ð°Ð½Ð»Ð°Ñ€Ð¸',
    tier3Title: '3-Ð´Ð°Ñ€Ð°Ð¶Ð° â€” ÒšÑžÑˆÐ¸Ð¼Ñ‡Ð° Ð¼Ð°Ð½Ð±Ð°Ð»Ð°Ñ€',
    sourceAuthorityNote: 'Ð¡ÑƒÐ½ÑŠÐ¸Ð¹ Ð¸Ð½Ñ‚ÐµÐ»Ð»ÐµÐºÑ‚ Ò›ÑƒÐ¹Ð¸Ð´Ð°Ð³Ð¸ Ñ‚Ð°Ñ€Ñ‚Ð¸Ð±Ð´Ð° Ñ‚ÐµÐºÑˆÐ¸Ñ€Ð°Ð´Ð¸: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'Ð‘ÐµÐ»Ð³Ð¸Ð»Ð°Ð½Ð³Ð°Ð½ Ð¿Ð¾ÑÑ‚Ð»Ð°Ñ€ Ð½Ð°Ð²Ð±Ð°Ñ‚Ð¸',
    refresh: 'Ð¯Ð½Ð³Ð¸Ð»Ð°Ñˆ',
    noFlaggedPosts: 'Ò²Ð°Ð»Ð¸ Ð±ÐµÐ»Ð³Ð¸Ð»Ð°Ð½Ð³Ð°Ð½ Ð¿Ð¾ÑÑ‚Ð»Ð°Ñ€ Ð¹ÑžÒ›.',
    adminPolicy: 'ÐÐ´Ð¼Ð¸Ð½ ÑÐ¸Ñ‘ÑÐ°Ñ‚Ð¸: Ð¡ÑƒÐ½ÑŠÐ¸Ð¹ Ð¸Ð½Ñ‚ÐµÐ»Ð»ÐµÐºÑ‚ Ð±ÐµÐ»Ð³Ð¸Ð»Ð°Ð¹Ð´Ð¸, Ð¾Ð´Ð°Ð¼Ð»Ð°Ñ€ Ò›Ð°Ñ€Ð¾Ñ€ Ò›Ð¸Ð»Ð°Ð´Ð¸.',
    copyBtn: 'ÐÑƒÑÑ…Ð°Ð»Ð°Ñˆ',
    reportBtn: 'Ð¨Ð¸ÐºÐ¾ÑÑ‚',
    dismissBtn: 'ÐŽÑ‚ÐºÐ°Ð·Ð¸Ð± ÑŽÐ±Ð¾Ñ€Ð¸Ñˆ',
    reportInstruction: 'FacebookÐ½Ð¸ Ð¾Ñ‡Ð¸Ð½Ð³ â†’ Ð¿Ð¾ÑÑ‚Ð½Ð¸ Ñ‚Ð¾Ð¿Ð¸Ð½Ð³ â†’ 3 Ð½ÑƒÒ›Ñ‚Ð° â†’ Ð¨Ð¸ÐºÐ¾ÑÑ‚ â†’ ÐÐ»Ò“Ð¾Ð½ Ð¼Ð°ÑŠÐ»ÑƒÐ¼Ð¾Ñ‚',
    removeImage: 'ÐŽÑ‡Ð¸Ñ€Ð¸Ñˆ',
  },

  ru: {
    appName: 'Ð’ÐµÑ€Ð¸Ñ„Ð¸ÐºÐ°Ñ‚Ð¾Ñ€ Ð¥Ð°Ð´Ð¸ÑÐ¾Ð²',
    appSubtitle: 'ÐÑƒÑ‚ÐµÐ½Ñ‚Ð¸Ñ„Ð¸ÐºÐ°Ñ†Ð¸Ñ Ñ…Ð°Ð´Ð¸ÑÐ¾Ð² Â· ÐšÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð¾Ñ€ Ð´ÑƒÐ° Â· RU Â· UZ Â· AR Â· EN Â· TJ',
    tabAnalyze: 'ÐÐ½Ð°Ð»Ð¸Ð· Ð¿Ð¾ÑÑ‚Ð°',
    tabDua: 'ÐšÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð¾Ñ€ Ð´ÑƒÐ°',
    tabSources: 'Ð˜ÑÑ‚Ð¾Ñ‡Ð½Ð¸ÐºÐ¸',
    tabSearch: 'Поиск',
    tabAdmin: 'ÐžÑ‡ÐµÑ€ÐµÐ´ÑŒ Ð¼Ð¾Ð´ÐµÑ€Ð°Ñ‚Ð¾Ñ€Ð°',
    statChecked: 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÐµÐ½Ð¾',
    statFlagged: 'ÐŸÐ¾Ð¼ÐµÑ‡ÐµÐ½Ð¾',
    statAuthentic: 'Ð”Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€Ð½Ð¾',
    pasteText: 'Ð’ÑÑ‚Ð°Ð²Ð¸Ñ‚ÑŒ Ñ‚ÐµÐºÑÑ‚',
    uploadScreenshot: 'Ð—Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚',
    pastePostContent: 'Ð’ÑÑ‚Ð°Ð²ÑŒÑ‚Ðµ Ñ‚ÐµÐºÑÑ‚ Ð¿Ð¾ÑÑ‚Ð°',
    postPlaceholder: 'Ð’ÑÑ‚Ð°Ð²ÑŒÑ‚Ðµ Ñ‚ÐµÐºÑÑ‚ Ð¿Ð¾ÑÑ‚Ð° Ð¸Ð· Facebook, Instagram Ð¸Ð»Ð¸ WhatsApp â€” Ð½Ð° Ð»ÑŽÐ±Ð¾Ð¼ ÑÐ·Ñ‹ÐºÐµ (ÑƒÐ·Ð±ÐµÐºÑÐºÐ¸Ð¹, Ð°Ñ€Ð°Ð±ÑÐºÐ¸Ð¹, Ñ€ÑƒÑÑÐºÐ¸Ð¹, Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ð¹...)',
    dragDrop: 'Ð˜Ð»Ð¸ Ð¿ÐµÑ€ÐµÑ‚Ð°Ñ‰Ð¸Ñ‚Ðµ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚ ÑÑŽÐ´Ð° Â· ÐÐ°Ð¶Ð¼Ð¸Ñ‚Ðµ Ð´Ð»Ñ Ð²Ñ‹Ð±Ð¾Ñ€Ð° Ñ„Ð°Ð¹Ð»Ð°',
    tryLabel: 'ÐŸÐ¾Ð¿Ñ€Ð¾Ð±ÑƒÐ¹Ñ‚Ðµ:',
    exampleFabricated: 'Ð’Ñ‹Ð´ÑƒÐ¼Ð°Ð½Ð½Ñ‹Ð¹ (ÑƒÐ·Ð±ÐµÐºÑÐºÐ¸Ð¹)',
    exampleChain: 'Ð¦ÐµÐ¿Ð½Ð¾Ðµ ÑÐ¾Ð¾Ð±Ñ‰ÐµÐ½Ð¸Ðµ',
    exampleAuthentic: 'Ð”Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€Ð½Ñ‹Ð¹ Ñ…Ð°Ð´Ð¸Ñ',
    analyzePost: 'ÐÐ½Ð°Ð»Ð¸Ð·Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¿Ð¾ÑÑ‚',
    analyzeScreenshot: 'ÐÐ½Ð°Ð»Ð¸Ð·Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚',
    analyzing: 'ÐÐ½Ð°Ð»Ð¸Ð·Ð¸Ñ€ÑƒÐµÑ‚ÑÑ...',
    readingImage: 'Ð§Ð¸Ñ‚Ð°ÐµÑ‚ÑÑ Ð¸Ð·Ð¾Ð±Ñ€Ð°Ð¶ÐµÐ½Ð¸Ðµ...',
    clear: 'ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ',
    replyIn: 'ÐžÑ‚Ð²ÐµÑ‚ Ð½Ð°:',
    extractedFromScreenshot: 'Ð¢ÐµÐºÑÑ‚ Ð¸Ð·Ð²Ð»ÐµÑ‡Ñ‘Ð½ Ð¸Ð· ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ð°',
    highConfidence: 'Ð²Ñ‹ÑÐ¾ÐºÐ°Ñ ÑƒÐ²ÐµÑ€ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ',
    mediumConfidence: 'ÑÑ€ÐµÐ´Ð½ÑÑ ÑƒÐ²ÐµÑ€ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ',
    lowConfidence: 'Ð½Ð¸Ð·ÐºÐ°Ñ ÑƒÐ²ÐµÑ€ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ',
    redFlagsDetected: 'ÐžÐ±Ð½Ð°Ñ€ÑƒÐ¶ÐµÐ½Ñ‹ Ð¿Ñ€Ð¸Ð·Ð½Ð°ÐºÐ¸ Ð¿Ð¾Ð´Ð´ÐµÐ»ÐºÐ¸',
    authenticScholarshipSays: 'Ð§Ñ‚Ð¾ Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ Ð´Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€Ð½Ð°Ñ Ð½Ð°ÑƒÐºÐ°',
    verifiedSources: 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÐµÐ½Ð½Ñ‹Ðµ Ð¸ÑÑ‚Ð¾Ñ‡Ð½Ð¸ÐºÐ¸',
    readyToPost: 'Ð“Ð¾Ñ‚Ð¾Ð²Ñ‹Ð¹ ÐºÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹',
    copyComment: 'ÐšÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ ÐºÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹',
    copied: 'Ð¡ÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¾!',
    viewInAdminQueue: 'ÐŸÑ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€ÐµÑ‚ÑŒ Ð² Ð¾Ñ‡ÐµÑ€ÐµÐ´Ð¸ â†’',
    verdictFabricated: 'Ð’Ñ‹Ð´ÑƒÐ¼Ð°Ð½Ð½Ñ‹Ð¹ Ñ…Ð°Ð´Ð¸Ñ',
    verdictWeak: 'Ð¡Ð»Ð°Ð±Ñ‹Ð¹ / Ð½ÐµÐ¿Ñ€Ð¾Ð²ÐµÑ€ÐµÐ½Ð½Ñ‹Ð¹',
    verdictAuthentic: 'Ð”Ð¾ÑÑ‚Ð¾Ð²ÐµÑ€Ð½Ñ‹Ð¹',
    verdictUnclear: 'Ð¢Ñ€ÐµÐ±ÑƒÐµÑ‚ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸',
    verdictNoHadith: 'Ð¥Ð°Ð´Ð¸Ñ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½',
    duaCorrectorTitle: 'ÐšÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð¾Ñ€ Ð´ÑƒÐ°',
    duaCorrectorSubtitle: 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÑÐµÑ‚ Ð¿Ð¾Ñ€ÑÐ´Ð¾Ðº ÑÐ»Ð¾Ð² Ð½Ð° Ð°Ñ€Ð°Ð±ÑÐºÐ¾Ð¼, Ð¾Ð³Ð»Ð°ÑÐ¾Ð²ÐºÐ¸ Ð¸ Ð¾ÑˆÐ¸Ð±ÐºÐ¸ Ñ‚Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ†Ð¸Ð¸.',
    duaPlaceholder: 'Ð’ÑÑ‚Ð°Ð²ÑŒÑ‚Ðµ Ñ‚ÐµÐºÑÑ‚ Ð´ÑƒÐ° Ð½Ð° Ð°Ñ€Ð°Ð±ÑÐºÐ¾Ð¼ Ð¸Ð»Ð¸ Ñ‚Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ†Ð¸ÑŽ â€” Ð½Ð° Ð»ÑŽÐ±Ð¾Ð¼ Ð°Ð»Ñ„Ð°Ð²Ð¸Ñ‚Ðµ...',
    exampleWrongOrder: 'ÐÐµÐ²ÐµÑ€Ð½Ñ‹Ð¹ Ð¿Ð¾Ñ€ÑÐ´Ð¾Ðº (ÐºÐ°Ðº Ð² Reel)',
    exampleArabicOnly: 'Ð¢Ð¾Ð»ÑŒÐºÐ¾ Ð°Ñ€Ð°Ð±ÑÐºÐ¸Ð¹',
    exampleTransliteration: 'Ð¢Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ†Ð¸Ñ',
    checkDua: 'ÐŸÑ€Ð¾Ð²ÐµÑ€Ð¸Ñ‚ÑŒ Ð´ÑƒÐ°',
    checking: 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÑÐµÑ‚ÑÑ...',
    errorsFound: 'ÐÐ°Ð¹Ð´ÐµÐ½Ñ‹ Ð¾ÑˆÐ¸Ð±ÐºÐ¸',
    correctArabic: 'Ð˜ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð½Ñ‹Ð¹ Ð°Ñ€Ð°Ð±ÑÐºÐ¸Ð¹ Ñ Ð¾Ð³Ð»Ð°ÑÐ¾Ð²ÐºÐ°Ð¼Ð¸',
    copyArabic: 'Ð¡ÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð°Ñ€Ð°Ð±ÑÐºÐ¸Ð¹',
    transliterations: 'Ð¢Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ†Ð¸Ð¸ â€” 4 Ð¿Ð¸ÑÑŒÐ¼Ð°',
    meaning: 'Ð—Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ / ÐŸÐµÑ€ÐµÐ²Ð¾Ð´',
    correctionComments: 'Ð“Ð¾Ñ‚Ð¾Ð²Ñ‹Ðµ ÐºÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¸ Ñ Ð¸ÑÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸ÐµÐ¼',
    duaCorrect: 'Ð”ÑƒÐ° Ð²ÐµÑ€Ð½Ð¾Ðµ',
    duaHasErrors: 'ÐÐ°Ð¹Ð´ÐµÐ½Ñ‹ Ð¾ÑˆÐ¸Ð±ÐºÐ¸',
    duaUnknown: 'ÐÐµÐ¸Ð·Ð²ÐµÑÑ‚Ð½Ð¾Ðµ Ð´ÑƒÐ°',
    source: 'Ð˜ÑÑ‚Ð¾Ñ‡Ð½Ð¸Ðº',
    tier1Title: 'Ð£Ñ€Ð¾Ð²ÐµÐ½ÑŒ 1 â€” ÐŸÐµÑ€Ð²Ð¸Ñ‡Ð½Ñ‹Ðµ ÑÐ±Ð¾Ñ€Ð½Ð¸ÐºÐ¸ (Ð²Ñ‹ÑÑˆÐ¸Ð¹ Ð°Ð²Ñ‚Ð¾Ñ€Ð¸Ñ‚ÐµÑ‚)',
    tier2Title: 'Ð£Ñ€Ð¾Ð²ÐµÐ½ÑŒ 2 â€” Ð£Ñ‡Ñ‘Ð½Ñ‹Ðµ Ð¾Ñ€Ð³Ð°Ð½Ñ‹ Ñ„ÐµÑ‚Ð²',
    tier3Title: 'Ð£Ñ€Ð¾Ð²ÐµÐ½ÑŒ 3 â€” Ð’ÑÐ¿Ð¾Ð¼Ð¾Ð³Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ Ð¸ÑÑ‚Ð¾Ñ‡Ð½Ð¸ÐºÐ¸',
    sourceAuthorityNote: 'Ð˜Ð˜ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÑÐµÑ‚ Ð² Ð¿Ð¾Ñ€ÑÐ´ÐºÐµ: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'ÐžÑ‡ÐµÑ€ÐµÐ´ÑŒ Ð¿Ð¾Ð¼ÐµÑ‡ÐµÐ½Ð½Ñ‹Ñ… Ð¿Ð¾ÑÑ‚Ð¾Ð²',
    refresh: 'ÐžÐ±Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ',
    noFlaggedPosts: 'ÐŸÐ¾Ð¼ÐµÑ‡ÐµÐ½Ð½Ñ‹Ñ… Ð¿Ð¾ÑÑ‚Ð¾Ð² Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚.',
    adminPolicy: 'ÐŸÐ¾Ð»Ð¸Ñ‚Ð¸ÐºÐ°: Ð˜Ð˜ Ð¿Ð¾Ð¼ÐµÑ‡Ð°ÐµÑ‚, Ð»ÑŽÐ´Ð¸ Ñ€ÐµÑˆÐ°ÑŽÑ‚. ÐÐ²Ñ‚Ð¾ÑƒÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ Ð¸ Ð°Ð²Ñ‚Ð¾Ð±Ð°Ð½ Ð·Ð°Ð¿Ñ€ÐµÑ‰ÐµÐ½Ñ‹.',
    copyBtn: 'ÐšÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ',
    reportBtn: 'ÐŸÐ¾Ð¶Ð°Ð»Ð¾Ð²Ð°Ñ‚ÑŒÑÑ',
    dismissBtn: 'ÐžÑ‚ÐºÐ»Ð¾Ð½Ð¸Ñ‚ÑŒ',
    reportInstruction: 'ÐžÑ‚ÐºÑ€Ð¾Ð¹Ñ‚Ðµ Facebook â†’ Ð½Ð°Ð¹Ð´Ð¸Ñ‚Ðµ Ð¿Ð¾ÑÑ‚ â†’ Ñ‚Ñ€Ð¸ Ñ‚Ð¾Ñ‡ÐºÐ¸ â†’ ÐŸÐ¾Ð¶Ð°Ð»Ð¾Ð²Ð°Ñ‚ÑŒÑÑ â†’ Ð›Ð¾Ð¶Ð½Ð°Ñ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸Ñ',
    removeImage: 'Ð£Ð´Ð°Ð»Ð¸Ñ‚ÑŒ',
  },

  ar: {
    appName: 'Ù…ÙˆØ«Ù‘Ù‚ Ø§Ù„Ø­Ø¯ÙŠØ«',
    appSubtitle: 'Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø£Ø­Ø§Ø¯ÙŠØ« Â· ØªØµØ­ÙŠØ­ Ø§Ù„Ø£Ø¯Ø¹ÙŠØ© Â· AR Â· UZ Â· RU Â· EN Â· TJ',
    tabAnalyze: 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù†Ø´ÙˆØ±',
    tabDua: 'ØªØµØ­ÙŠØ­ Ø§Ù„Ø¯Ø¹Ø§Ø¡',
    tabSearch: 'بحث',
    tabSources: 'Ø§Ù„Ù…ØµØ§Ø¯Ø±',
    tabAdmin: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©',
    statChecked: 'ØªÙ… ÙØ­ØµÙ‡Ø§',
    statFlagged: 'Ù…ÙØ¨Ù„ÙŽÙ‘Øº Ø¹Ù†Ù‡Ø§',
    statAuthentic: 'ØµØ­ÙŠØ­Ø©',
    pasteText: 'Ù„ØµÙ‚ Ø§Ù„Ù†Øµ',
    uploadScreenshot: 'Ø±ÙØ¹ Ù„Ù‚Ø·Ø© Ø´Ø§Ø´Ø©',
    pastePostContent: 'Ø§Ù„ØµÙ‚ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ù†Ø´ÙˆØ±',
    postPlaceholder: 'Ø§Ù„ØµÙ‚ Ù†Øµ Ø§Ù„Ù…Ù†Ø´ÙˆØ± Ù…Ù† ÙÙŠØ³Ø¨ÙˆÙƒ Ø£Ùˆ Ø¥Ù†Ø³ØªØºØ±Ø§Ù… Ø£Ùˆ ÙˆØ§ØªØ³Ø§Ø¨ â€” Ø¨Ø£ÙŠ Ù„ØºØ© (Ø£ÙˆØ²Ø¨ÙƒÙŠØ©ØŒ Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø±ÙˆØ³ÙŠØ©ØŒ Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©...)',
    dragDrop: 'Ø£Ùˆ Ø§Ø³Ø­Ø¨ ÙˆØ£ÙÙ„Øª Ù„Ù‚Ø·Ø© Ø§Ù„Ø´Ø§Ø´Ø© Ù‡Ù†Ø§ Â· Ø§Ù†Ù‚Ø± Ù„Ù„ØªØµÙØ­',
    tryLabel: 'Ø¬Ø±Ù‘Ø¨:',
    exampleFabricated: 'Ù…ÙˆØ¶ÙˆØ¹ (Ø£ÙˆØ²Ø¨ÙƒÙŠ)',
    exampleChain: 'Ø±Ø³Ø§Ù„Ø© Ù…ØªØ³Ù„Ø³Ù„Ø©',
    exampleAuthentic: 'Ø­Ø¯ÙŠØ« ØµØ­ÙŠØ­',
    analyzePost: 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù†Ø´ÙˆØ±',
    analyzeScreenshot: 'ØªØ­Ù„ÙŠÙ„ Ù„Ù‚Ø·Ø© Ø§Ù„Ø´Ø§Ø´Ø©',
    analyzing: 'Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù„ÙŠÙ„...',
    readingImage: 'Ø¬Ø§Ø±Ù Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„ØµÙˆØ±Ø©...',
    clear: 'Ù…Ø³Ø­',
    replyIn: 'Ø§Ù„Ø±Ø¯ Ø¨Ù€:',
    extractedFromScreenshot: 'Ø§Ù„Ù†Øµ Ø§Ù„Ù…Ø³ØªØ®Ø±Ø¬ Ù…Ù† Ù„Ù‚Ø·Ø© Ø§Ù„Ø´Ø§Ø´Ø©',
    highConfidence: 'Ø«Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©',
    mediumConfidence: 'Ø«Ù‚Ø© Ù…ØªÙˆØ³Ø·Ø©',
    lowConfidence: 'Ø«Ù‚Ø© Ù…Ù†Ø®ÙØ¶Ø©',
    redFlagsDetected: 'Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù…ÙƒØªØ´ÙØ©',
    authenticScholarshipSays: 'Ù…Ø§ ØªÙ‚ÙˆÙ„Ù‡ Ø§Ù„Ø¹Ù„ÙˆÙ… Ø§Ù„Ø¥Ø³Ù„Ø§Ù…ÙŠØ© Ø§Ù„ØµØ­ÙŠØ­Ø©',
    verifiedSources: 'Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ù…ÙˆØ«Ù‘Ù‚Ø©',
    readyToPost: 'ØªØ¹Ù„ÙŠÙ‚ Ø¬Ø§Ù‡Ø² Ù„Ù„Ù†Ø´Ø±',
    copyComment: 'Ù†Ø³Ø® Ø§Ù„ØªØ¹Ù„ÙŠÙ‚',
    copied: 'ØªÙ… Ø§Ù„Ù†Ø³Ø®!',
    viewInAdminQueue: 'Ø¹Ø±Ø¶ ÙÙŠ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© â†',
    verdictFabricated: 'Ø­Ø¯ÙŠØ« Ù…ÙˆØ¶ÙˆØ¹',
    verdictWeak: 'Ø­Ø¯ÙŠØ« Ø¶Ø¹ÙŠÙ / ØºÙŠØ± Ù…ÙˆØ«Ù‘Ù‚',
    verdictAuthentic: 'Ø­Ø¯ÙŠØ« ØµØ­ÙŠØ­',
    verdictUnclear: 'ÙŠØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ ØªØ­Ù‚Ù‚',
    verdictNoHadith: 'Ù„Ù… ÙŠÙØ¹Ø«Ø± Ø¹Ù„Ù‰ Ø­Ø¯ÙŠØ«',
    duaCorrectorTitle: 'ØªØµØ­ÙŠØ­ Ø§Ù„Ø¯Ø¹Ø§Ø¡',
    duaCorrectorSubtitle: 'ÙŠÙØ­Øµ ØªØ±ØªÙŠØ¨ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© ÙˆØ§Ù„ØªØ´ÙƒÙŠÙ„ ÙˆØ£Ø®Ø·Ø§Ø¡ Ø§Ù„Ù†Ù‚Ø­Ø±Ø©.',
    duaPlaceholder: 'Ø§Ù„ØµÙ‚ Ù†Øµ Ø§Ù„Ø¯Ø¹Ø§Ø¡ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø£Ùˆ Ø§Ù„Ù†Ù‚Ø­Ø±Ø© â€” Ø¨Ø£ÙŠ Ø®Ø·...',
    exampleWrongOrder: 'ØªØ±ØªÙŠØ¨ Ø®Ø§Ø·Ø¦ (ÙƒÙ…Ø§ ÙÙŠ Ø§Ù„Ø±ÙŠÙ„Ø²)',
    exampleArabicOnly: 'Ø¹Ø±Ø¨ÙŠ ÙÙ‚Ø·',
    exampleTransliteration: 'Ù†Ù‚Ø­Ø±Ø©',
    checkDua: 'ÙØ­Øµ Ø§Ù„Ø¯Ø¹Ø§Ø¡',
    checking: 'Ø¬Ø§Ø±Ù Ø§Ù„ÙØ­Øµ...',
    errorsFound: 'ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø£Ø®Ø·Ø§Ø¡',
    correctArabic: 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ù…ØµØ­ÙŽÙ‘Ø­Ø© Ù…Ø¹ Ø§Ù„ØªØ´ÙƒÙŠÙ„',
    copyArabic: 'Ù†Ø³Ø® Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©',
    transliterations: 'Ø§Ù„Ù†Ù‚Ø­Ø±Ø§Øª â€” 4 Ø®Ø·ÙˆØ·',
    meaning: 'Ø§Ù„Ù…Ø¹Ù†Ù‰ / Ø§Ù„ØªØ±Ø¬Ù…Ø©',
    correctionComments: 'ØªØ¹Ù„ÙŠÙ‚Ø§Øª Ø§Ù„ØªØµØ­ÙŠØ­ Ø§Ù„Ø¬Ø§Ù‡Ø²Ø©',
    duaCorrect: 'Ø§Ù„Ø¯Ø¹Ø§Ø¡ ØµØ­ÙŠØ­',
    duaHasErrors: 'ØªÙˆØ¬Ø¯ Ø£Ø®Ø·Ø§Ø¡',
    duaUnknown: 'Ø¯Ø¹Ø§Ø¡ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ',
    source: 'Ø§Ù„Ù…ØµØ¯Ø±',
    tier1Title: 'Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ â€” Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© (Ø£Ø¹Ù„Ù‰ Ø³Ù„Ø·Ø©)',
    tier2Title: 'Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø«Ø§Ù†ÙŠØ© â€” Ù‡ÙŠØ¦Ø§Øª Ø§Ù„ÙØªÙˆÙ‰ Ø§Ù„Ø¹Ù„Ù…ÙŠØ©',
    tier3Title: 'Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø«Ø§Ù„Ø«Ø© â€” Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ø¯Ø§Ø¹Ù…Ø©',
    sourceAuthorityNote: 'ÙŠØªØ­Ù‚Ù‚ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø¨Ø§Ù„ØªØ±ØªÙŠØ¨: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù†Ø´ÙˆØ±Ø§Øª Ø§Ù„Ù…ÙØ¨Ù„ÙŽÙ‘Øº Ø¹Ù†Ù‡Ø§',
    refresh: 'ØªØ­Ø¯ÙŠØ«',
    noFlaggedPosts: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†Ø´ÙˆØ±Ø§Øª Ù…ÙØ¨Ù„ÙŽÙ‘Øº Ø¹Ù†Ù‡Ø§ Ø¨Ø¹Ø¯.',
    adminPolicy: 'Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©: Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ÙŠÙØ¨Ù„ÙÙ‘ØºØŒ Ø§Ù„Ø¨Ø´Ø± ÙŠÙ‚Ø±Ø±ÙˆÙ†. Ù„Ø§ Ø­Ø°Ù ØªÙ„Ù‚Ø§Ø¦ÙŠ.',
    copyBtn: 'Ù†Ø³Ø®',
    reportBtn: 'Ø¥Ø¨Ù„Ø§Øº',
    dismissBtn: 'ØªØ¬Ø§Ù‡Ù„',
    reportInstruction: 'Ø§ÙØªØ­ ÙÙŠØ³Ø¨ÙˆÙƒ â† Ø§Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù…Ù†Ø´ÙˆØ± â† Ø«Ù„Ø§Ø« Ù†Ù‚Ø§Ø· â† Ø¥Ø¨Ù„Ø§Øº â† Ù…Ø¹Ù„ÙˆÙ…Ø§Øª ÙƒØ§Ø°Ø¨Ø©',
    removeImage: 'Ø¥Ø²Ø§Ù„Ø©',
  },
  tj: {
    appName: 'Ð¢Ð°ÑÐ´Ð¸Ò›ÐºÑƒÐ½Ð°Ð½Ð´Ð°Ð¸ Ò²Ð°Ð´Ð¸Ñ',
    appSubtitle: 'ÐÑƒÑ‚ÐµÐ½Ñ‚Ð¸ÐºÐ°Ñ‚ÑÐ¸ÑÐ¸ Ò³Ð°Ð´Ð¸Ñ Â· Ð˜ÑÐ»Ð¾Ò³ÐºÑƒÐ½Ð°Ð½Ð´Ð°Ð¸ Ð´ÑƒÐ¾ Â· TJ Â· UZ Â· AR Â· RU Â· EN',
    tabAnalyze: 'Ð¢Ð°Ò³Ð»Ð¸Ð»Ð¸ Ð¿Ð°Ñ‘Ð¼',
    tabSearch: 'Ҷустуҷӯ',
    tabDua: 'Ð˜ÑÐ»Ð¾Ò³ÐºÑƒÐ½Ð°Ð½Ð´Ð°Ð¸ Ð´ÑƒÐ¾',
    tabSources: 'ÐœÐ°Ð½Ð±Ð°Ò³Ð¾',
    tabAdmin: 'ÐÐ°Ð²Ð±Ð°Ñ‚Ð¸ Ð¼Ð°ÑŠÐ¼ÑƒÑ€',
    statChecked: 'Ð¡Ð°Ð½Ò·Ð¸Ð´Ð° ÑˆÑƒÐ´',
    statFlagged: 'ÒšÐ°Ð¹Ð´ ÑˆÑƒÐ´',
    statAuthentic: 'Ð¡Ð°Ò³ÐµÒ³',
    pasteText: 'ÐœÐ°Ñ‚Ð½Ñ€Ð¾ Ò·Ð¾Ð¹Ð³Ð¸Ñ€ ÐºÑƒÐ½ÐµÐ´',
    uploadScreenshot: 'Ð¡ÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚ Ð±Ð¾Ñ€ ÐºÑƒÐ½ÐµÐ´',
    pastePostContent: 'ÐœÐ°Ñ‚Ð½Ð¸ Ð¿Ð°Ñ‘Ð¼Ñ€Ð¾ Ò·Ð¾Ð¹Ð³Ð¸Ñ€ ÐºÑƒÐ½ÐµÐ´',
    postPlaceholder: 'ÐœÐ°Ñ‚Ð½Ð¸ Ð¿Ð°Ñ‘Ð¼Ð¸ Facebook, Instagram Ñ‘ WhatsApp-Ñ€Ð¾ Ò·Ð¾Ð¹Ð³Ð¸Ñ€ ÐºÑƒÐ½ÐµÐ´ â€” Ð±Ð° Ò³Ð°Ñ€ Ð·Ð°Ð±Ð¾Ð½ (Ñ‚Ð¾Ò·Ð¸ÐºÓ£, Ð°Ñ€Ð°Ð±Ó£, Ñ€ÑƒÑÓ£, Ð°Ð½Ð³Ð»Ð¸ÑÓ£...)',
    dragDrop: 'Ð ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ñ€Ð¾ Ð¸Ð½ Ò·Ð¾ ÐºÐ°ÑˆÐµÐ´ Â· Ð‘Ð°Ñ€Ð¾Ð¸ Ð¸Ð½Ñ‚Ð¸Ñ…Ð¾Ð± ÐºÐ»Ð¸Ðº ÐºÑƒÐ½ÐµÐ´',
    tryLabel: 'Ð¡Ð°Ð½Ò·ÐµÐ´:',
    exampleFabricated: 'Ð¡Ð¾Ñ…Ñ‚Ð° (Ó¯Ð·Ð±ÐµÐºÓ£)',
    exampleChain: 'ÐŸÐ°Ñ‘Ð¼Ð¸ Ð·Ð°Ð½Ò·Ð¸Ñ€Ó£',
    exampleAuthentic: 'Ò²Ð°Ð´Ð¸ÑÐ¸ ÑÐ°Ò³ÐµÒ³',
    analyzePost: 'Ð¢Ð°Ò³Ð»Ð¸Ð»Ð¸ Ð¿Ð°Ñ‘Ð¼',
    analyzeScreenshot: 'Ð¢Ð°Ò³Ð»Ð¸Ð»Ð¸ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚',
    analyzing: 'Ð¢Ð°Ò³Ð»Ð¸Ð» Ð¼ÐµÑˆÐ°Ð²Ð°Ð´...',
    readingImage: 'ÐÐºÑ Ñ…Ð¾Ð½Ð´Ð° Ð¼ÐµÑˆÐ°Ð²Ð°Ð´...',
    clear: 'Ð¢Ð¾Ð·Ð° ÐºÐ°Ñ€Ð´Ð°Ð½',
    replyIn: 'Ò¶Ð°Ð²Ð¾Ð± Ð±Ð°:',
    extractedFromScreenshot: 'ÐœÐ°Ñ‚Ð½ Ð°Ð· ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚ Ð³Ð¸Ñ€Ð¸Ñ„Ñ‚Ð° ÑˆÑƒÐ´',
    highConfidence: 'ÑÑŠÑ‚Ð¸Ð¼Ð¾Ð´Ð¸ Ð±Ð°Ð»Ð°Ð½Ð´',
    mediumConfidence: 'ÑÑŠÑ‚Ð¸Ð¼Ð¾Ð´Ð¸ Ð¼Ð¸Ñ‘Ð½Ð°',
    lowConfidence: 'ÑÑŠÑ‚Ð¸Ð¼Ð¾Ð´Ð¸ Ð¿Ð°ÑÑ‚',
    redFlagsDetected: 'ÐÐ»Ð¾Ð¼Ð°Ñ‚Ò³Ð¾Ð¸ ÑÐ¾Ñ…Ñ‚Ð° Ð±ÑƒÐ´Ð°Ð½ Ð¾ÑˆÐºÐ¾Ñ€ ÑˆÑƒÐ´',
    authenticScholarshipSays: 'Ð˜Ð»Ð¼Ð¸ ÑÐ°Ò³ÐµÒ³ Ñ‡Ó£ Ð¼ÐµÐ³Ó¯ÑÐ´',
    verifiedSources: 'ÐœÐ°Ð½Ð±Ð°Ò³Ð¾Ð¸ Ñ‚Ð°ÑÐ´Ð¸Ò›ÑˆÑƒÐ´Ð°',
    readyToPost: 'Ð¨Ð°Ñ€Ò³Ð¸ Ð¾Ð¼Ð¾Ð´Ð°Ð¸ Ð½Ð°ÑˆÑ€',
    copyComment: 'ÐÑƒÑÑ…Ð°Ð±Ð°Ñ€Ð´Ð¾Ñ€Ð¸Ð¸ ÑˆÐ°Ñ€Ò³',
    copied: 'ÐÑƒÑÑ…Ð°Ð±Ð°Ñ€Ð´Ð¾Ñ€Ó£ ÑˆÑƒÐ´!',
    viewInAdminQueue: 'Ð”Ð°Ñ€ Ð½Ð°Ð²Ð±Ð°Ñ‚Ð¸ Ð¼Ð°ÑŠÐ¼ÑƒÑ€ Ð±Ð¸Ð½ÐµÐ´ â†’',
    verdictFabricated: 'Ò²Ð°Ð´Ð¸ÑÐ¸ ÑÐ¾Ñ…Ñ‚Ð°',
    verdictWeak: 'Ð—Ð°Ð¸Ñ„ / Ñ‚Ð°ÑÐ´Ð¸Ò›Ð½Ð°ÑˆÑƒÐ´Ð°',
    verdictAuthentic: 'Ð¡Ð°Ò³ÐµÒ³',
    verdictUnclear: 'Ð¡Ð°Ð½Ò·Ð¸Ñˆ Ð»Ð¾Ð·Ð¸Ð¼',
    verdictNoHadith: 'Ò²Ð°Ð´Ð¸Ñ Ñ‘Ñ„Ñ‚ Ð½Ð°ÑˆÑƒÐ´',
    duaCorrectorTitle: 'Ð˜ÑÐ»Ð¾Ò³ÐºÑƒÐ½Ð°Ð½Ð´Ð°Ð¸ Ð´ÑƒÐ¾',
    duaCorrectorSubtitle: 'Ð¢Ð°Ñ€Ñ‚Ð¸Ð±Ð¸ ÐºÐ°Ð»Ð¸Ð¼Ð°Ò³Ð¾Ð¸ Ð°Ñ€Ð°Ð±Ó£, Ò³Ð°Ñ€Ð°ÐºÐ°Ñ‚Ò³Ð¾ Ð²Ð° Ñ…Ð°Ñ‚Ð¾Ò³Ð¾Ð¸ Ñ‚Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ‚ÑÐ¸ÑÑ€Ð¾ ÑÐ°Ð½Ò·Ð°Ð´.',
    duaPlaceholder: 'ÐœÐ°Ñ‚Ð½Ð¸ Ð´ÑƒÐ¾Ð¸ Ð°Ñ€Ð°Ð±Ó£ Ñ‘ Ñ‚Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ‚ÑÐ¸ÑÑ€Ð¾ Ò·Ð¾Ð¹Ð³Ð¸Ñ€ ÐºÑƒÐ½ÐµÐ´ â€” Ð±Ð¾ Ò³Ð°Ñ€ Ð°Ð»Ð¸Ñ„Ð±Ð¾...',
    exampleWrongOrder: 'Ð¢Ð°Ñ€Ñ‚Ð¸Ð±Ð¸ Ð½Ð¾Ð´ÑƒÑ€ÑƒÑÑ‚ (Ð¼Ð¸ÑÐ»Ð¸ Reel)',
    exampleArabicOnly: 'Ð¢Ð°Ð½Ò³Ð¾ Ð°Ñ€Ð°Ð±Ó£',
    exampleTransliteration: 'Ð¢Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ‚ÑÐ¸Ñ',
    checkDua: 'Ð¡Ð°Ð½Ò·Ð¸ÑˆÐ¸ Ð´ÑƒÐ¾',
    checking: 'Ð¡Ð°Ð½Ò·Ð¸Ð´Ð° Ð¼ÐµÑˆÐ°Ð²Ð°Ð´...',
    errorsFound: 'Ð¥Ð°Ñ‚Ð¾Ò³Ð¾ Ñ‘Ñ„Ñ‚ ÑˆÑƒÐ´',
    correctArabic: 'ÐÑ€Ð°Ð±Ð¸Ð¸ Ð¸ÑÐ»Ð¾Ò³ÑˆÑƒÐ´Ð° Ð±Ð¾ Ò³Ð°Ñ€Ð°ÐºÐ°Ñ‚Ò³Ð¾',
    copyArabic: 'ÐÑƒÑÑ…Ð°Ð±Ð°Ñ€Ð´Ð¾Ñ€Ð¸Ð¸ Ð°Ñ€Ð°Ð±Ó£',
    transliterations: 'Ð¢Ñ€Ð°Ð½ÑÐ»Ð¸Ñ‚ÐµÑ€Ð°Ñ‚ÑÐ¸ÑÒ³Ð¾ â€” 4 Ñ…Ð°Ñ‚',
    meaning: 'ÐœÐ°ÑŠÐ½Ð¾ / Ð¢Ð°Ñ€Ò·ÑƒÐ¼Ð°',
    correctionComments: 'Ð¨Ð°Ñ€Ò³Ò³Ð¾Ð¸ Ð¾Ð¼Ð¾Ð´Ð°Ð¸ Ð¸ÑÐ»Ð¾Ò³',
    duaCorrect: 'Ð”ÑƒÐ¾Ð¸ Ð´ÑƒÑ€ÑƒÑÑ‚',
    duaHasErrors: 'Ð¥Ð°Ñ‚Ð¾Ò³Ð¾ Ð¼Ð°Ð²Ò·ÑƒÐ´Ð°Ð½Ð´',
    duaUnknown: 'Ð”ÑƒÐ¾Ð¸ Ð½Ð¾Ð¼Ð°ÑŠÐ»ÑƒÐ¼',
    source: 'ÐœÐ°Ð½Ð±Ð°',
    tier1Title: 'Ð”Ð°Ñ€Ð°Ò·Ð°Ð¸ 1 â€” ÐœÐ°Ò·Ð¼Ó¯Ð°Ò³Ð¾Ð¸ Ð°ÑÐ¾ÑÓ£ (Ð±Ð°Ð»Ð°Ð½Ð´Ñ‚Ð°Ñ€Ð¸Ð½ ÑÑŠÑ‚Ð¸Ð±Ð¾Ñ€)',
    tier2Title: 'Ð”Ð°Ñ€Ð°Ò·Ð°Ð¸ 2 â€” ÐœÐ°Ò›Ð¾Ð¼Ð¾Ñ‚Ð¸ Ñ„Ð°Ñ‚Ð²Ð¾Ð¸ ÑƒÐ»Ð°Ð¼Ð¾',
    tier3Title: 'Ð”Ð°Ñ€Ð°Ò·Ð°Ð¸ 3 â€” ÐœÐ°Ð½Ð±Ð°Ò³Ð¾Ð¸ Ð¸Ð»Ð¾Ð²Ð°Ð³Ó£',
    sourceAuthorityNote: 'Ð—ÐµÒ³Ð½Ð¸ ÑÑƒÐ½ÑŠÓ£ Ñ‚Ð¸Ð±Ò›Ð¸ Ñ‚Ð°Ñ€Ñ‚Ð¸Ð± ÑÐ°Ð½Ò·Ð°Ð´: Dorar.net â†’ Sunnah.com â†’ IslamQA â†’ HadeethEnc',
    flaggedPostsQueue: 'ÐÐ°Ð²Ð±Ð°Ñ‚Ð¸ Ð¿Ð°Ñ‘Ð¼Ò³Ð¾Ð¸ Ò›Ð°Ð¹Ð´ÑˆÑƒÐ´Ð°',
    refresh: 'ÐÐ°Ð²ÑÐ¾Ð·Ó£',
    noFlaggedPosts: 'Ò²Ð¾Ð»Ð¾ Ð¿Ð°Ñ‘Ð¼Ò³Ð¾Ð¸ Ò›Ð°Ð¹Ð´ÑˆÑƒÐ´Ð° Ð½ÐµÑÑ‚.',
    adminPolicy: 'Ð¡Ð¸Ñ‘ÑÐ°Ñ‚Ð¸ Ð¼Ð°ÑŠÐ¼ÑƒÑ€: Ð—ÐµÒ³Ð½Ð¸ ÑÑƒÐ½ÑŠÓ£ Ò›Ð°Ð¹Ð´ Ð¼ÐµÐºÑƒÐ½Ð°Ð´, Ð¾Ð´Ð°Ð¼Ð¾Ð½ Ò›Ð°Ñ€Ð¾Ñ€ Ð¼ÐµÐ³Ð¸Ñ€Ð°Ð½Ð´. ÐÐµÑÑ‚ ÐºÐ°Ñ€Ð´Ð°Ð½Ð¸ Ñ…ÑƒÐ´ÐºÐ¾Ñ€ Ð¼Ð°Ð½ÑŠ Ð°ÑÑ‚.',
    copyBtn: 'ÐÑƒÑÑ…Ð°Ð±Ð°Ñ€Ð´Ð¾Ñ€Ó£',
    reportBtn: 'Ð¨Ð¸ÐºÐ¾ÑÑ‚',
    dismissBtn: 'Ð Ð°Ð´ ÐºÐ°Ñ€Ð´Ð°Ð½',
    reportInstruction: 'Facebook-Ñ€Ð¾ ÐºÑƒÑˆÐ¾ÐµÐ´ â†’ Ð¿Ð°Ñ‘Ð¼Ñ€Ð¾ Ñ‘Ð±ÐµÐ´ â†’ ÑÐµ Ð½ÑƒÒ›Ñ‚Ð° â†’ Ð¨Ð¸ÐºÐ¾ÑÑ‚ â†’ ÐœÐ°ÑŠÐ»ÑƒÐ¼Ð¾Ñ‚Ð¸ Ð´ÑƒÑ€Ó¯Ò“',
    removeImage: 'Ð¥Ð¾Ñ€Ð¸Ò· ÐºÐ°Ñ€Ð´Ð°Ð½',
  },
}

export function t(lang: AppLang): Translations {
  return translations[lang] || translations.en
}

export function getDir(lang: AppLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

