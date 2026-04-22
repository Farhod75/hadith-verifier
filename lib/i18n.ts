// ============================================================
// HADITH VERIFIER — Internationalization (i18n)
// App UI translations for EN, UZ Latin, UZ Cyrillic, RU, AR
// ============================================================

export type AppLang = 'en' | 'uz_latin' | 'uz_cyrillic' | 'ru' | 'ar' | 'tj'

export const APP_LANGUAGES = [
  { code: 'en' as AppLang, label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'uz_latin' as AppLang, label: "O'zbek", flag: '🇺🇿', dir: 'ltr' },
  { code: 'uz_cyrillic' as AppLang, label: 'Ўзбек', flag: '🇺🇿', dir: 'ltr' },
  { code: 'ru' as AppLang, label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar' as AppLang, label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'tj' as AppLang, label: 'Тоҷикӣ', flag: '🇹🇯', dir: 'ltr' }, // ← add this
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
    appSubtitle: 'Hadith authentication · Dua corrector · EN · UZ · AR · RU',
    tabAnalyze: 'Analyze post',
    tabDua: 'Dua corrector',
    tabSources: 'Sources',
    tabAdmin: 'Admin queue',
    statChecked: 'Checked',
    statFlagged: 'Flagged',
    statAuthentic: 'Authentic',
    pasteText: 'Paste text',
    uploadScreenshot: 'Upload screenshot',
    pastePostContent: 'Paste post content',
    postPlaceholder: 'Paste Facebook, Instagram, or WhatsApp post text — any language (Uzbek, Arabic, Russian, English...)',
    dragDrop: 'Or drag & drop a screenshot · Click to browse',
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
    viewInAdminQueue: 'View in admin queue →',
    verdictFabricated: 'Fabricated hadith',
    verdictWeak: 'Weak / unverified',
    verdictAuthentic: 'Authentic',
    verdictUnclear: 'Needs verification',
    verdictNoHadith: 'No hadith found',
    duaCorrectorTitle: 'Dua corrector',
    duaCorrectorSubtitle: 'Checks Arabic word order, diacritics, and transliteration errors. Provides correct text in 4 scripts.',
    duaPlaceholder: 'Paste Arabic dua text, transliteration, or both — any script (Arabic, Cyrillic, Latin)...',
    exampleWrongOrder: 'Wrong order (like Reel)',
    exampleArabicOnly: 'Arabic only',
    exampleTransliteration: 'Transliteration',
    checkDua: 'Check dua',
    checking: 'Checking...',
    errorsFound: 'Errors found',
    correctArabic: 'Corrected Arabic with diacritics',
    copyArabic: 'Copy Arabic',
    transliterations: 'Transliterations — 4 scripts',
    meaning: 'Meaning / Translation',
    correctionComments: 'Ready-to-post correction comments',
    duaCorrect: 'Correct dua',
    duaHasErrors: 'Errors found',
    duaUnknown: 'Unknown dua',
    source: 'Source',
    tier1Title: 'Tier 1 — Primary collections (highest authority)',
    tier2Title: 'Tier 2 — Scholarly bodies',
    tier3Title: 'Tier 3 — Supporting sources',
    sourceAuthorityNote: 'AI is instructed to prioritize: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'Flagged posts queue',
    refresh: 'Refresh',
    noFlaggedPosts: 'No flagged posts yet. Analyze posts to populate the queue.',
    adminPolicy: 'Admin policy: AI flags, humans decide. Never auto-delete or auto-ban.',
    copyBtn: 'Copy',
    reportBtn: 'Report',
    dismissBtn: 'Dismiss',
    reportInstruction: 'Open Facebook → find post → 3 dots → Report → False information',
    removeImage: 'Remove',
  },

  uz_latin: {
    appName: 'Hadis Tekshiruvchi',
    appSubtitle: 'Hadis autentifikatsiyasi · Duo tuzatuvchi · UZ · RU · AR · EN',
    tabAnalyze: 'Postni tahlil qilish',
    tabDua: 'Duo tuzatuvchi',
    tabSources: 'Manbalar',
    tabAdmin: 'Admin navbati',
    statChecked: 'Tekshirildi',
    statFlagged: 'Belgilandi',
    statAuthentic: 'Sahih',
    pasteText: 'Matn joylashtiring',
    uploadScreenshot: 'Skrinshot yuklang',
    pastePostContent: 'Post matnini joylashtiring',
    postPlaceholder: 'Facebook, Instagram yoki WhatsApp post matnini joylashtiring — istalgan tilda (oʻzbekcha, arabcha, ruscha, inglizcha...)',
    dragDrop: 'Yoki skrinshotni shu yerga tashlang · Koʻrish uchun bosing',
    tryLabel: 'Sinab koʻring:',
    exampleFabricated: 'Uydirma (oʻzbekcha)',
    exampleChain: 'Zanjir xabar',
    exampleAuthentic: 'Sahih hadis',
    analyzePost: 'Postni tahlil qilish',
    analyzeScreenshot: 'Skrinshotni tahlil qilish',
    analyzing: 'Tahlil qilinmoqda...',
    readingImage: 'Rasm oʻqilmoqda...',
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
    viewInAdminQueue: 'Admin navbatida koʻrish →',
    verdictFabricated: 'Uydirma hadis',
    verdictWeak: 'Zaif / tasdiqlanmagan',
    verdictAuthentic: 'Sahih',
    verdictUnclear: 'Tekshirish kerak',
    verdictNoHadith: 'Hadis topilmadi',
    duaCorrectorTitle: 'Duo tuzatuvchi',
    duaCorrectorSubtitle: 'Arabcha soʻzlar tartibini, harakat belgilarini va transkripsiya xatolarini tekshiradi.',
    duaPlaceholder: 'Arabcha duo matnini yoki transkriptsiyasini joylashtiring...',
    exampleWrongOrder: 'Notoʻgʻri tartib (Reel kabi)',
    exampleArabicOnly: 'Faqat arabcha',
    exampleTransliteration: 'Transkriptsiya',
    checkDua: 'Duoni tekshirish',
    checking: 'Tekshirilmoqda...',
    errorsFound: 'Xatolar topildi',
    correctArabic: 'Tuzatilgan arabcha (harakat belgilari bilan)',
    copyArabic: 'Arabchani nusxalash',
    transliterations: 'Transkriptsiyalar — 4 yozuv',
    meaning: 'Maʼno / Tarjima',
    correctionComments: 'Tuzatish izohlari',
    duaCorrect: 'Toʻgʻri duo',
    duaHasErrors: 'Xatolar bor',
    duaUnknown: 'Nomaʼlum duo',
    source: 'Manba',
    tier1Title: '1-daraja — Asosiy toʻplamlar (eng yuqori obro\')',
    tier2Title: '2-daraja — Olimlik fatvo organlari',
    tier3Title: '3-daraja — Qoʻshimcha manbalar',
    sourceAuthorityNote: 'Sun\'iy intellekt quyidagi tartibda tekshiradi: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'Belgilangan postlar navbati',
    refresh: 'Yangilash',
    noFlaggedPosts: 'Hali belgilangan postlar yoʻq.',
    adminPolicy: 'Admin siyosati: Sun\'iy intellekt belgilaydi, odamlar qaror qiladi.',
    copyBtn: 'Nusxalash',
    reportBtn: 'Shikoyat',
    dismissBtn: 'Oʻtkazib yuborish',
    reportInstruction: 'Facebookni oching → postni toping → 3 nuqta → Shikoyat → Yolgʻon maʼlumot',
    removeImage: 'Oʻchirish',
  },

  uz_cyrillic: {
    appName: 'Ҳадис Текширувчи',
    appSubtitle: 'Ҳадис аутентификацияси · Дуо тузатувчи · ЎЗ · РУ · АР · ИН',
    tabAnalyze: 'Постни таҳлил қилиш',
    tabDua: 'Дуо тузатувчи',
    tabSources: 'Манбалар',
    tabAdmin: 'Админ навбати',
    statChecked: 'Текширилди',
    statFlagged: 'Белгиланди',
    statAuthentic: 'Саҳиҳ',
    pasteText: 'Матн жойлаштиринг',
    uploadScreenshot: 'Скриншот юкланг',
    pastePostContent: 'Пост матнини жойлаштиринг',
    postPlaceholder: 'Facebook, Instagram ёки WhatsApp пост матнини жойлаштиринг — исталган тилда (ўзбекча, арабча, русча, инглизча...)',
    dragDrop: 'Ёки скриншотни шу ерга ташланг · Кўриш учун босинг',
    tryLabel: 'Синаб кўринг:',
    exampleFabricated: 'Уйдирма (ўзбекча)',
    exampleChain: 'Занжир хабар',
    exampleAuthentic: 'Саҳиҳ ҳадис',
    analyzePost: 'Постни таҳлил қилиш',
    analyzeScreenshot: 'Скриншотни таҳлил қилиш',
    analyzing: 'Таҳлил қилинмоқда...',
    readingImage: 'Расм ўқилмоқда...',
    clear: 'Тозалаш',
    replyIn: 'Жавоб тили:',
    extractedFromScreenshot: 'Скриншотдан ажратиб олинган матн',
    highConfidence: 'юқори ишончлилик',
    mediumConfidence: 'ўртача ишончлилик',
    lowConfidence: 'паст ишончлилик',
    redFlagsDetected: 'Хавф белгилари аниқланди',
    authenticScholarshipSays: 'Саҳиҳ илм нима дейди',
    verifiedSources: 'Тасдиқланган манбалар',
    readyToPost: 'Жойлаштирга тайёр изоҳ',
    copyComment: 'Изоҳни нусхалаш',
    copied: 'Нусхаланди!',
    viewInAdminQueue: 'Админ навбатида кўриш →',
    verdictFabricated: 'Уйдирма ҳадис',
    verdictWeak: 'Заиф / тасдиқланмаган',
    verdictAuthentic: 'Саҳиҳ',
    verdictUnclear: 'Текшириш керак',
    verdictNoHadith: 'Ҳадис топилмади',
    duaCorrectorTitle: 'Дуо тузатувчи',
    duaCorrectorSubtitle: 'Арабча сўзлар тартибини, ҳаракат белгиларини ва транскрипция хатоларини текширади.',
    duaPlaceholder: 'Арабча дуо матнини ёки транскрипциясини жойлаштиринг...',
    exampleWrongOrder: 'Нотўғри тартиб (Reel каби)',
    exampleArabicOnly: 'Фақат арабча',
    exampleTransliteration: 'Транскрипция',
    checkDua: 'Дуони текшириш',
    checking: 'Текширилмоқда...',
    errorsFound: 'Хатолар топилди',
    correctArabic: 'Тузатилган арабча (ҳаракат белгилари билан)',
    copyArabic: 'Арабчани нусхалаш',
    transliterations: 'Транскрипциялар — 4 ёзув',
    meaning: 'Маъно / Таржима',
    correctionComments: 'Тузатиш изоҳлари',
    duaCorrect: 'Тўғри дуо',
    duaHasErrors: 'Хатолар бор',
    duaUnknown: 'Номаълум дуо',
    source: 'Манба',
    tier1Title: '1-даража — Асосий тўпламлар',
    tier2Title: '2-даража — Олимлик фатво органлари',
    tier3Title: '3-даража — Қўшимча манбалар',
    sourceAuthorityNote: 'Сунъий интеллект қуйидаги тартибда текширади: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'Белгиланган постлар навбати',
    refresh: 'Янгилаш',
    noFlaggedPosts: 'Ҳали белгиланган постлар йўқ.',
    adminPolicy: 'Админ сиёсати: Сунъий интеллект белгилайди, одамлар қарор қилади.',
    copyBtn: 'Нусхалаш',
    reportBtn: 'Шикоят',
    dismissBtn: 'Ўтказиб юбориш',
    reportInstruction: 'Facebookни очинг → постни топинг → 3 нуқта → Шикоят → Ёлғон маълумот',
    removeImage: 'Ўчириш',
  },

  ru: {
    appName: 'Верификатор Хадисов',
    appSubtitle: 'Аутентификация хадисов · Корректор дуа · RU · UZ · AR · EN',
    tabAnalyze: 'Анализ поста',
    tabDua: 'Корректор дуа',
    tabSources: 'Источники',
    tabAdmin: 'Очередь модератора',
    statChecked: 'Проверено',
    statFlagged: 'Помечено',
    statAuthentic: 'Достоверно',
    pasteText: 'Вставить текст',
    uploadScreenshot: 'Загрузить скриншот',
    pastePostContent: 'Вставьте текст поста',
    postPlaceholder: 'Вставьте текст поста из Facebook, Instagram или WhatsApp — на любом языке (узбекский, арабский, русский, английский...)',
    dragDrop: 'Или перетащите скриншот сюда · Нажмите для выбора файла',
    tryLabel: 'Попробуйте:',
    exampleFabricated: 'Выдуманный (узбекский)',
    exampleChain: 'Цепное сообщение',
    exampleAuthentic: 'Достоверный хадис',
    analyzePost: 'Анализировать пост',
    analyzeScreenshot: 'Анализировать скриншот',
    analyzing: 'Анализируется...',
    readingImage: 'Читается изображение...',
    clear: 'Очистить',
    replyIn: 'Ответ на:',
    extractedFromScreenshot: 'Текст извлечён из скриншота',
    highConfidence: 'высокая уверенность',
    mediumConfidence: 'средняя уверенность',
    lowConfidence: 'низкая уверенность',
    redFlagsDetected: 'Обнаружены признаки подделки',
    authenticScholarshipSays: 'Что говорит достоверная наука',
    verifiedSources: 'Проверенные источники',
    readyToPost: 'Готовый комментарий',
    copyComment: 'Копировать комментарий',
    copied: 'Скопировано!',
    viewInAdminQueue: 'Просмотреть в очереди →',
    verdictFabricated: 'Выдуманный хадис',
    verdictWeak: 'Слабый / непроверенный',
    verdictAuthentic: 'Достоверный',
    verdictUnclear: 'Требует проверки',
    verdictNoHadith: 'Хадис не найден',
    duaCorrectorTitle: 'Корректор дуа',
    duaCorrectorSubtitle: 'Проверяет порядок слов на арабском, огласовки и ошибки транслитерации.',
    duaPlaceholder: 'Вставьте текст дуа на арабском или транслитерацию — на любом алфавите...',
    exampleWrongOrder: 'Неверный порядок (как в Reel)',
    exampleArabicOnly: 'Только арабский',
    exampleTransliteration: 'Транслитерация',
    checkDua: 'Проверить дуа',
    checking: 'Проверяется...',
    errorsFound: 'Найдены ошибки',
    correctArabic: 'Исправленный арабский с огласовками',
    copyArabic: 'Скопировать арабский',
    transliterations: 'Транслитерации — 4 письма',
    meaning: 'Значение / Перевод',
    correctionComments: 'Готовые комментарии с исправлением',
    duaCorrect: 'Дуа верное',
    duaHasErrors: 'Найдены ошибки',
    duaUnknown: 'Неизвестное дуа',
    source: 'Источник',
    tier1Title: 'Уровень 1 — Первичные сборники (высший авторитет)',
    tier2Title: 'Уровень 2 — Учёные органы фетв',
    tier3Title: 'Уровень 3 — Вспомогательные источники',
    sourceAuthorityNote: 'ИИ проверяет в порядке: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'Очередь помеченных постов',
    refresh: 'Обновить',
    noFlaggedPosts: 'Помеченных постов пока нет.',
    adminPolicy: 'Политика: ИИ помечает, люди решают. Автоудаление и автобан запрещены.',
    copyBtn: 'Копировать',
    reportBtn: 'Пожаловаться',
    dismissBtn: 'Отклонить',
    reportInstruction: 'Откройте Facebook → найдите пост → три точки → Пожаловаться → Ложная информация',
    removeImage: 'Удалить',
  },

  ar: {
    appName: 'موثّق الحديث',
    appSubtitle: 'التحقق من الأحاديث · تصحيح الأدعية · AR · UZ · RU · EN',
    tabAnalyze: 'تحليل المنشور',
    tabDua: 'تصحيح الدعاء',
    tabSources: 'المصادر',
    tabAdmin: 'قائمة الإدارة',
    statChecked: 'تم فحصها',
    statFlagged: 'مُبلَّغ عنها',
    statAuthentic: 'صحيحة',
    pasteText: 'لصق النص',
    uploadScreenshot: 'رفع لقطة شاشة',
    pastePostContent: 'الصق محتوى المنشور',
    postPlaceholder: 'الصق نص المنشور من فيسبوك أو إنستغرام أو واتساب — بأي لغة (أوزبكية، عربية، روسية، إنجليزية...)',
    dragDrop: 'أو اسحب وأفلت لقطة الشاشة هنا · انقر للتصفح',
    tryLabel: 'جرّب:',
    exampleFabricated: 'موضوع (أوزبكي)',
    exampleChain: 'رسالة متسلسلة',
    exampleAuthentic: 'حديث صحيح',
    analyzePost: 'تحليل المنشور',
    analyzeScreenshot: 'تحليل لقطة الشاشة',
    analyzing: 'جارٍ التحليل...',
    readingImage: 'جارٍ قراءة الصورة...',
    clear: 'مسح',
    replyIn: 'الرد بـ:',
    extractedFromScreenshot: 'النص المستخرج من لقطة الشاشة',
    highConfidence: 'ثقة عالية',
    mediumConfidence: 'ثقة متوسطة',
    lowConfidence: 'ثقة منخفضة',
    redFlagsDetected: 'علامات الوضع المكتشفة',
    authenticScholarshipSays: 'ما تقوله العلوم الإسلامية الصحيحة',
    verifiedSources: 'المصادر الموثّقة',
    readyToPost: 'تعليق جاهز للنشر',
    copyComment: 'نسخ التعليق',
    copied: 'تم النسخ!',
    viewInAdminQueue: 'عرض في قائمة الإدارة ←',
    verdictFabricated: 'حديث موضوع',
    verdictWeak: 'حديث ضعيف / غير موثّق',
    verdictAuthentic: 'حديث صحيح',
    verdictUnclear: 'يحتاج إلى تحقق',
    verdictNoHadith: 'لم يُعثر على حديث',
    duaCorrectorTitle: 'تصحيح الدعاء',
    duaCorrectorSubtitle: 'يفحص ترتيب الكلمات العربية والتشكيل وأخطاء النقحرة.',
    duaPlaceholder: 'الصق نص الدعاء بالعربية أو النقحرة — بأي خط...',
    exampleWrongOrder: 'ترتيب خاطئ (كما في الريلز)',
    exampleArabicOnly: 'عربي فقط',
    exampleTransliteration: 'نقحرة',
    checkDua: 'فحص الدعاء',
    checking: 'جارٍ الفحص...',
    errorsFound: 'تم العثور على أخطاء',
    correctArabic: 'العربية المصحَّحة مع التشكيل',
    copyArabic: 'نسخ العربية',
    transliterations: 'النقحرات — 4 خطوط',
    meaning: 'المعنى / الترجمة',
    correctionComments: 'تعليقات التصحيح الجاهزة',
    duaCorrect: 'الدعاء صحيح',
    duaHasErrors: 'توجد أخطاء',
    duaUnknown: 'دعاء غير معروف',
    source: 'المصدر',
    tier1Title: 'الدرجة الأولى — المجموعات الأساسية (أعلى سلطة)',
    tier2Title: 'الدرجة الثانية — هيئات الفتوى العلمية',
    tier3Title: 'الدرجة الثالثة — المصادر الداعمة',
    sourceAuthorityNote: 'يتحقق الذكاء الاصطناعي بالترتيب: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'قائمة المنشورات المُبلَّغ عنها',
    refresh: 'تحديث',
    noFlaggedPosts: 'لا توجد منشورات مُبلَّغ عنها بعد.',
    adminPolicy: 'سياسة الإدارة: الذكاء الاصطناعي يُبلِّغ، البشر يقررون. لا حذف تلقائي.',
    copyBtn: 'نسخ',
    reportBtn: 'إبلاغ',
    dismissBtn: 'تجاهل',
    reportInstruction: 'افتح فيسبوك ← ابحث عن المنشور ← ثلاث نقاط ← إبلاغ ← معلومات كاذبة',
    removeImage: 'إزالة',
  },
  tj: {
    appName: 'Тасдиқкунандаи Ҳадис',
    appSubtitle: 'Аутентикатсияи ҳадис · Ислоҳкунандаи дуо · TJ · UZ · AR · RU',
    tabAnalyze: 'Таҳлили паём',
    tabDua: 'Ислоҳкунандаи дуо',
    tabSources: 'Манбаҳо',
    tabAdmin: 'Навбати маъмур',
    statChecked: 'Санҷида шуд',
    statFlagged: 'Қайд шуд',
    statAuthentic: 'Саҳеҳ',
    pasteText: 'Матнро ҷойгир кунед',
    uploadScreenshot: 'Скриншот бор кунед',
    pastePostContent: 'Матни паёмро ҷойгир кунед',
    postPlaceholder: 'Матни паёми Facebook, Instagram ё WhatsApp-ро ҷойгир кунед — ба ҳар забон (тоҷикӣ, арабӣ, русӣ, англисӣ...)',
    dragDrop: 'Ё скриншотро ин ҷо кашед · Барои интихоб клик кунед',
    tryLabel: 'Санҷед:',
    exampleFabricated: 'Сохта (ӯзбекӣ)',
    exampleChain: 'Паёми занҷирӣ',
    exampleAuthentic: 'Ҳадиси саҳеҳ',
    analyzePost: 'Таҳлили паём',
    analyzeScreenshot: 'Таҳлили скриншот',
    analyzing: 'Таҳлил мешавад...',
    readingImage: 'Акс хонда мешавад...',
    clear: 'Тоза кардан',
    replyIn: 'Ҷавоб ба:',
    extractedFromScreenshot: 'Матн аз скриншот гирифта шуд',
    highConfidence: 'эътимоди баланд',
    mediumConfidence: 'эътимоди миёна',
    lowConfidence: 'эътимоди паст',
    redFlagsDetected: 'Аломатҳои сохта будан ошкор шуд',
    authenticScholarshipSays: 'Илми саҳеҳ чӣ мегӯяд',
    verifiedSources: 'Манбаҳои тасдиқшуда',
    readyToPost: 'Шарҳи омодаи нашр',
    copyComment: 'Нусхабардории шарҳ',
    copied: 'Нусхабардорӣ шуд!',
    viewInAdminQueue: 'Дар навбати маъмур бинед →',
    verdictFabricated: 'Ҳадиси сохта',
    verdictWeak: 'Заиф / тасдиқнашуда',
    verdictAuthentic: 'Саҳеҳ',
    verdictUnclear: 'Санҷиш лозим',
    verdictNoHadith: 'Ҳадис ёфт нашуд',
    duaCorrectorTitle: 'Ислоҳкунандаи дуо',
    duaCorrectorSubtitle: 'Тартиби калимаҳои арабӣ, ҳаракатҳо ва хатоҳои транслитератсияро санҷад.',
    duaPlaceholder: 'Матни дуои арабӣ ё транслитератсияро ҷойгир кунед — бо ҳар алифбо...',
    exampleWrongOrder: 'Тартиби нодуруст (мисли Reel)',
    exampleArabicOnly: 'Танҳо арабӣ',
    exampleTransliteration: 'Транслитератсия',
    checkDua: 'Санҷиши дуо',
    checking: 'Санҷида мешавад...',
    errorsFound: 'Хатоҳо ёфт шуд',
    correctArabic: 'Арабии ислоҳшуда бо ҳаракатҳо',
    copyArabic: 'Нусхабардории арабӣ',
    transliterations: 'Транслитератсияҳо — 4 хат',
    meaning: 'Маъно / Тарҷума',
    correctionComments: 'Шарҳҳои омодаи ислоҳ',
    duaCorrect: 'Дуои дуруст',
    duaHasErrors: 'Хатоҳо мавҷуданд',
    duaUnknown: 'Дуои номаълум',
    source: 'Манба',
    tier1Title: 'Дараҷаи 1 — Маҷмӯаҳои асосӣ (баландтарин эътибор)',
    tier2Title: 'Дараҷаи 2 — Мақомоти фатвои уламо',
    tier3Title: 'Дараҷаи 3 — Манбаҳои иловагӣ',
    sourceAuthorityNote: 'Зеҳни сунъӣ тибқи тартиб санҷад: Dorar.net → Sunnah.com → IslamQA → HadeethEnc',
    flaggedPostsQueue: 'Навбати паёмҳои қайдшуда',
    refresh: 'Навсозӣ',
    noFlaggedPosts: 'Ҳоло паёмҳои қайдшуда нест.',
    adminPolicy: 'Сиёсати маъмур: Зеҳни сунъӣ қайд мекунад, одамон қарор мегиранд. Нест кардани худкор манъ аст.',
    copyBtn: 'Нусхабардорӣ',
    reportBtn: 'Шикоят',
    dismissBtn: 'Рад кардан',
    reportInstruction: 'Facebook-ро кушоед → паёмро ёбед → се нуқта → Шикоят → Маълумоти дурӯғ',
    removeImage: 'Хорид кардан',
  },
}

export function t(lang: AppLang): Translations {
  return translations[lang] || translations.en
}

export function getDir(lang: AppLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}
