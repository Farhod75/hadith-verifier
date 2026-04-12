// tests/fixtures/test-data.ts
// Test data for Hadith Verifier Playwright tests
// Used for CT-GenAI certification portfolio

export const FABRICATED_POSTS = {
  uzbek: `Мусулмонлар диққат билан эшитинг
Расул (с.а.в) айтдилар:
1. Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа қилган савоби ёзилади.
2. Ким ухлашдан олдин 3 марта Сура Ихлос ўқиса, бир марта Қуръонни хатм қилган савобини олади.
Бу видеони улашиб, бошқаларга ҳам билиш имконини яратиб беринг.`,

  chain_message: `URGENT SHARE: Prophet ﷺ said whoever reads this dua 7 times 
and shares with 10 people tonight, Allah will forgive ALL their sins 
and open the gates of Jannah. Don't break the chain! Share NOW! 🕌`,

  arabic: `من قرأ سورة الفاتحة 4 مرات قبل النوم كتب له ثواب 4000 يوم صدقة
شاركها مع 10 أشخاص ولا تكسر السلسلة`,

  russian: `Пророк ﷺ сказал: Кто прочитает суру Аль-Фатиха 4 раза перед сном,
тому запишется награда 4000 дней садака. Перешли 10 людям!`,
}

export const AUTHENTIC_POSTS = {
  bukhari: `The Messenger of Allah ﷺ said: 
"Whoever prays Fajr and Asr will enter Paradise." 
— Sahih al-Bukhari 574, Sahih Muslim 635`,

  ikhlas: `The Prophet ﷺ said that Surah Al-Ikhlas is equivalent to 
one-third of the Quran. — Sahih al-Bukhari 5013`,

  intentions: `The Prophet ﷺ said: "Actions are judged by intentions, 
and every person will get what they intended." 
— Sahih al-Bukhari 1, Sahih Muslim 1907`,
}

export const RED_FLAGS = {
  large_numbers: ['4000', '70000', '1000 days'],
  chain_pressure: ['share with 10', 'don\'t break the chain', 'share NOW'],
  guaranteed_paradise: ['guaranteed paradise', 'gates of Jannah will open'],
  no_isnad: ['no chain of narration', 'no source', 'no reference'],
}

export const EXPECTED_VERDICTS = {
  fabricated: ['fabricated', 'weak'],
  authentic: ['authentic'],
  uncertain: ['unclear', 'no_hadith'],
}

export const VALID_SOURCE_DOMAINS = [
  'sunnah.com',
  'dorar.net',
  'islamqa.info',
  'hadeethenc.com',
  'islamweb.net',
  'yaqeeninstitute.org',
]
