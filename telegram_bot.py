"""
Hadith Verifier - Telegram bot  (REFERENCE ONLY since P398)
==============================
The live bot is app/api/telegram/webhook/route.ts on the HV deployment. This file was
written for Railway, where the bot was documented as hosted but never ran. Kept for its
tests and as a fallback if a long-running host is ever wanted.

Forward the bot any post with a hadith - from Telegram, Instagram, Facebook or
WhatsApp: text, a photo with a caption, or a screenshot. It answers with the
same analysis hadithverifier.com gives: the verdict, the sources with deep
links, and a gentle reply that can be pasted under the post.

P396 (2026-11-11): the bot no longer asks the model itself. It used its own
short prompt - a second source policy beside the site's, no Tajik, text only,
and a Markdown reply that Telegram refused whenever the model wrote an "_" or
"*". Every check now goes to HV's /api/analyze: one prompt, one source policy,
one admin queue. Replies are HTML with every model string escaped.

Environment:
  TELEGRAM_BOT_TOKEN   required
  HV_API_URL           default https://hadithverifier.com/api/analyze
  HV_BOT_KEY           optional. When it matches HV's HV_BOT_KEY, the site counts
                       the bot under its own hourly cap instead of the per-IP one
                       (every bot request comes from one Railway IP). The site's
                       global daily cap still applies.

Run: python telegram_bot.py   (Railway: the same command)
Tests: python -m pytest tests/python/test_telegram_bot.py  (offline)
"""
from __future__ import annotations

import html
import logging
import os
import re
import time

import httpx
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
HV_API_URL = os.getenv("HV_API_URL", "https://hadithverifier.com/api/analyze")
HV_BOT_KEY = os.getenv("HV_BOT_KEY", "")

USER_HOURLY_CAP = 10          # per Telegram user; the site has its own caps
TELEGRAM_LIMIT = 4000         # Telegram allows 4096; room for safety
MIN_TEXT = 10

# ---- languages -------------------------------------------------------------
# HV's reply languages (app/api/analyze getLangInstruction).
LANGS = ("en", "ru", "uz", "uz_latin", "tj", "ar")
LANG_NAMES = {"en": "English", "ru": "Русский", "uz": "Ўзбекча", "uz_latin": "Oʻzbekcha",
              "tj": "Тоҷикӣ", "ar": "العربية"}
LANG_COMMANDS = {"lang_en": "en", "lang_ru": "ru", "lang_uz": "uz", "lang_uzl": "uz_latin",
                 "lang_tj": "tj", "lang_ar": "ar"}


def lang_from_telegram(code: str | None) -> str:
    """The user's Telegram interface language -> an HV reply language."""
    c = (code or "").lower().split("-")[0]
    return {"ru": "ru", "uz": "uz", "tg": "tj", "ar": "ar", "en": "en"}.get(c, "en")


_TJ = set("ӣӯҷ")                      # Tajik letters Uzbek Cyrillic does not use
_UZ_CYR = set("ў")                    # Uzbek letter Tajik does not use
_SHARED_CA = set("ҳқғ")               # both Tajik and Uzbek
_UZ_LATIN = re.compile(r"(?:\b[a-z]*(?:o|g)[ʻ'’‘`][a-z]*\b|\b(?:va|bilan|uchun|emas|qiladi|qilgan|kim|Alloh|Payg'ambar|hadis)\b)",
                       re.IGNORECASE)


def detect_post_lang(text: str) -> str | None:
    """The language a reply under this post should be in, or None when the text does
    not tell (Arabic only, or too little). A reply belongs in the post's language."""
    t = re.sub(r"https?://\S+|@\w+|#\w+", " ", text or "")    # links, handles and tags say nothing
    if _TJ & set(t):
        return "tj"
    if _UZ_CYR & set(t):
        return "uz"
    cyr = sum(1 for ch in t if "Ѐ" <= ch <= "ӿ")
    lat = sum(1 for ch in t if ch.isascii() and ch.isalpha())
    if cyr >= 20 and cyr >= lat:
        return "uz" if (_SHARED_CA & set(t)) else "ru"
    if lat >= 20:
        return "uz_latin" if len(_UZ_LATIN.findall(t)) >= 2 else "en"
    return None


# ---- the bot's own words ----------------------------------------------------
UI = {
    "welcome": {
        "en": ("🌙 <b>Hadith Verifier</b>\n\nForward me any post with a hadith - from Telegram, Instagram, "
               "Facebook or WhatsApp: the text, a photo with a caption, or a screenshot.\n\nI'll tell you "
               "whether the hadith is authentic, weak or fabricated, show the sources (Sunnah.com, Dorar, "
               "HadeethEnc) and give you a gentle reply you can paste under the post."),
        "ru": ("🌙 <b>Hadith Verifier</b>\n\nПерешлите мне любой пост с хадисом - из Telegram, Instagram, "
               "Facebook или WhatsApp: текст, фото с подписью или скриншот.\n\nЯ скажу, достоверный хадис, "
               "слабый или выдуманный, покажу источники (Sunnah.com, Dorar, HadeethEnc) и дам мягкий ответ, "
               "который можно вставить под пост."),
        "uz": ("🌙 <b>Hadith Verifier</b>\n\nМенга ҳадис бор ҳар қандай постни юборинг - Telegram, Instagram, "
               "Facebook ёки WhatsApp’дан: матн, изоҳли расм ёки скриншот.\n\nҲадис ишончлими, заифми ёки "
               "тўқимами - айтаман, манбаларни (Sunnah.com, Dorar, HadeethEnc) кўрсатаман ва пост остига "
               "қўйиш мумкин бўлган юмшоқ жавоб бераман."),
        "uz_latin": ("🌙 <b>Hadith Verifier</b>\n\nMenga hadis bor har qanday postni yuboring - Telegram, "
                     "Instagram, Facebook yoki WhatsApp’dan: matn, izohli rasm yoki skrinshot.\n\nHadis "
                     "ishonchlimi, zaifmi yoki toʻqimami - aytaman, manbalarni (Sunnah.com, Dorar, HadeethEnc) "
                     "koʻrsataman va post ostiga qoʻyish mumkin boʻlgan yumshoq javob beraman."),
        "tj": ("🌙 <b>Hadith Verifier</b>\n\nБа ман ҳар гуна постеро, ки дар он ҳадис ҳаст, фиристед - аз "
               "Telegram, Instagram, Facebook ё WhatsApp: матн, акс бо тавзеҳ ё скриншот.\n\nМан мегӯям, ки "
               "ҳадис боэътимод аст, заиф ё сохта, манбаъҳоро (Sunnah.com, Dorar, HadeethEnc) нишон медиҳам "
               "ва ҷавоби нармеро пешниҳод мекунам, ки зери пост гузоштан мумкин аст."),
        "ar": ("🌙 <b>Hadith Verifier</b>\n\nأرسل إليّ أي منشور فيه حديث - من تيليجرام أو إنستغرام أو فيسبوك أو "
               "واتساب: نصًا أو صورة مع تعليق أو لقطة شاشة.\n\nسأخبرك هل الحديث ثابت أم ضعيف أم موضوع، وأعرض "
               "المصادر (Sunnah.com وDorar وHadeethEnc)، وأقترح ردًا لطيفًا يمكنك نشره تحت المنشور."),
    },
    "reply_lang": {"en": "Reply language", "ru": "Язык ответа", "uz": "Жавоб тили",
                   "uz_latin": "Javob tili", "tj": "Забони ҷавоб", "ar": "لغة الرد"},
    "auto_lang": {"en": "(by default the post's own language)", "ru": "(по умолчанию - язык самого поста)",
                  "uz": "(одатда - постнинг ўз тили)", "uz_latin": "(odatda - postning oʻz tili)",
                  "tj": "(бо пешфарз - забони худи пост)", "ar": "(افتراضيًا: لغة المنشور نفسه)"},
    "change": {"en": "Change", "ru": "Сменить", "uz": "Ўзгартириш", "uz_latin": "Oʻzgartirish",
               "tj": "Иваз кардан", "ar": "للتغيير"},
    "checking": {"en": "🔍 Checking…", "ru": "🔍 Проверяю…", "uz": "🔍 Текширяпман…",
                 "uz_latin": "🔍 Tekshiryapman…", "tj": "🔍 Месанҷам…", "ar": "🔍 جارٍ التحقق…"},
    "too_short": {
        "en": "Send the post's text (at least a sentence), a photo with a caption, or a screenshot.",
        "ru": "Пришлите текст поста (хотя бы одно предложение), фото с подписью или скриншот.",
        "uz": "Пост матнини (ҳеч бўлмаса бир жумла), изоҳли расм ёки скриншот юборинг.",
        "uz_latin": "Post matnini (hech boʻlmasa bir jumla), izohli rasm yoki skrinshot yuboring.",
        "tj": "Матни постро (ақаллан як ҷумла), акс бо тавзеҳ ё скриншот фиристед.",
        "ar": "أرسل نص المنشور (جملة على الأقل) أو صورة مع تعليق أو لقطة شاشة.",
    },
    "no_media": {
        "en": "I can't watch videos or open video links yet. Send the post's text or a screenshot of it.",
        "ru": "Видео и ссылки на видео я пока проверить не могу. Пришлите текст поста или его скриншот.",
        "uz": "Видео ва видео ҳаволаларини ҳозирча текшира олмайман. Пост матнини ёки скриншотини юборинг.",
        "uz_latin": "Video va video havolalarini hozircha tekshira olmayman. Post matnini yoki skrinshotini yuboring.",
        "tj": "Видео ва пайвандҳои видеоро ҳоло санҷида наметавонам. Матни пост ё скриншоти онро фиристед.",
        "ar": "لا أستطيع بعدُ فحص الفيديو أو روابط الفيديو. أرسل نص المنشور أو لقطة شاشة له.",
    },
    "failed": {
        "en": "The check failed. Please try again in a minute.",
        "ru": "Проверка не удалась. Попробуйте через минуту.",
        "uz": "Текширув амалга ошмади. Бир дақиқадан кейин қайта уриниб кўринг.",
        "uz_latin": "Tekshiruv amalga oshmadi. Bir daqiqadan keyin qayta urinib koʻring.",
        "tj": "Санҷиш анҷом наёфт. Пас аз як дақиқа боз кӯшиш кунед.",
        "ar": "تعذّر الفحص. حاول مرة أخرى بعد دقيقة.",
    },
    "user_limit": {
        "en": "That's 10 checks this hour. Please continue a little later, or on hadithverifier.com.",
        "ru": "Это уже 10 проверок за час. Продолжите чуть позже или на hadithverifier.com.",
        "uz": "Бир соатда 10 та текширув бўлди. Бироздан кейин давом этинг ёки hadithverifier.com’дан фойдаланинг.",
        "uz_latin": "Bir soatda 10 ta tekshiruv boʻldi. Birozdan keyin davom eting yoki hadithverifier.com’dan foydalaning.",
        "tj": "Дар як соат 10 санҷиш шуд. Каме баъдтар идома диҳед ё аз hadithverifier.com истифода баред.",
        "ar": "هذه 10 فحوص خلال ساعة. تابع بعد قليل أو استخدم hadithverifier.com.",
    },
    "verdict": {
        "fabricated": {"en": "Fabricated", "ru": "Выдуманный (мавду‘)", "uz": "Тўқима (мавзуъ)",
                       "uz_latin": "Toʻqima (mavzuʼ)", "tj": "Сохта (мавзӯъ)", "ar": "موضوع"},
        "weak": {"en": "Weak", "ru": "Слабый (да‘иф)", "uz": "Заиф", "uz_latin": "Zaif", "tj": "Заиф", "ar": "ضعيف"},
        "authentic": {"en": "Authentic", "ru": "Достоверный", "uz": "Ишончли", "uz_latin": "Ishonchli",
                      "tj": "Боэътимод", "ar": "ثابت"},
        "unclear": {"en": "Needs checking", "ru": "Требует проверки", "uz": "Текширишни талаб қилади",
                    "uz_latin": "Tekshirishni talab qiladi", "tj": "Санҷишро талаб мекунад", "ar": "يحتاج إلى تحقق"},
        "no_hadith": {"en": "No hadith found", "ru": "Хадис не найден", "uz": "Ҳадис топилмади",
                      "uz_latin": "Hadis topilmadi", "tj": "Ҳадис ёфт нашуд", "ar": "لم يُعثر على حديث"},
    },
    "red_flags": {"en": "Red flags", "ru": "Тревожные признаки", "uz": "Шубҳали белгилар",
                  "uz_latin": "Shubhali belgilar", "tj": "Аломатҳои шубҳанок", "ar": "علامات التحذير"},
    "authentic_alt": {"en": "What the sources say", "ru": "Что говорят источники", "uz": "Манбалар нима дейди",
                      "uz_latin": "Manbalar nima deydi", "tj": "Манбаъҳо чӣ мегӯянд", "ar": "ما تقوله المصادر"},
    "sources": {"en": "Sources", "ru": "Источники", "uz": "Манбалар", "uz_latin": "Manbalar",
                "tj": "Манбаъҳо", "ar": "المصادر"},
    "comment": {"en": "Reply you can paste under the post (tap to copy):",
                "ru": "Ответ, который можно вставить под пост (нажмите, чтобы скопировать):",
                "uz": "Пост остига қўйиш мумкин бўлган жавоб (нусха олиш учун босинг):",
                "uz_latin": "Post ostiga qoʻyish mumkin boʻlgan javob (nusxa olish uchun bosing):",
                "tj": "Ҷавобе, ки зери пост гузоштан мумкин аст (барои нусха гирифтан пахш кунед):",
                "ar": "رد يمكنك نشره تحت المنشور (اضغط للنسخ):"},
    "not_fatwa": {
        "en": "This is an automated check, not a fatwa. For a ruling, ask a qualified scholar.",
        "ru": "Это автоматическая проверка, а не фетва. За решением обращайтесь к знающему учёному.",
        "uz": "Бу автоматик текширув, фатво эмас. Ҳукм учун илмли уламога мурожаат қилинг.",
        "uz_latin": "Bu avtomatik tekshiruv, fatvo emas. Hukm uchun ilmli ulamoga murojaat qiling.",
        "tj": "Ин санҷиши худкор аст, на фатво. Барои ҳукм ба олими босалоҳият муроҷиат кунед.",
        "ar": "هذا فحص آلي وليس فتوى. للحكم الشرعي اسأل عالمًا مؤهلًا.",
    },
}

VERDICT_EMOJI = {"fabricated": "❌", "weak": "⚠️", "authentic": "✅", "unclear": "🔍", "no_hadith": "ℹ️"}


def ui(key: str, lang: str) -> str:
    table = UI[key]
    return table.get(lang) or table["en"]


def welcome_text(lang: str) -> str:
    cmds = " ".join("/" + c for c in LANG_COMMANDS)
    return "%s\n\n%s: <b>%s</b> %s\n%s: %s\n\nhadithverifier.com" % (
        ui("welcome", lang), ui("reply_lang", lang), html.escape(LANG_NAMES[lang]),
        ui("auto_lang", lang), ui("change", lang), cmds)


# ---- what the user sent ----------------------------------------------------
_VIDEO_LINK = re.compile(r"https?://(?:www\.)?(?:instagram\.com|tiktok\.com|vm\.tiktok\.com|youtu\.be|youtube\.com|"
                         r"facebook\.com|fb\.watch)\S*", re.IGNORECASE)


def classify_input(text: str, has_image: bool, has_video: bool) -> str:
    """'image' | 'text' | 'video_only' | 'too_short'. PURE."""
    t = (text or "").strip()
    if has_image:
        return "image"
    without_links = _VIDEO_LINK.sub("", t).strip()
    if len(without_links) >= MIN_TEXT:
        return "text"
    if has_video or _VIDEO_LINK.search(t):
        return "video_only"
    return "too_short"


# ---- the answer ------------------------------------------------------------
def _e(s) -> str:
    return html.escape(str(s or ""), quote=False)


def format_blocks(result: dict, lang: str) -> list[str]:
    """The analysis as HTML blocks, each valid on its own, every model string escaped. PURE."""
    verdict = result.get("verdict") or "unclear"
    label = UI["verdict"].get(verdict, UI["verdict"]["unclear"])
    blocks = ["%s <b>%s</b>\n\n<b>%s</b>\n%s" % (
        VERDICT_EMOJI.get(verdict, "🔍"), _e(label.get(lang) or label["en"]),
        _e(result.get("claim_summary")), _e(result.get("analysis")))]
    flags = [f for f in (result.get("red_flags") or []) if str(f).strip()]
    if flags:
        blocks.append("🚩 <b>%s</b>\n%s" % (ui("red_flags", lang), "\n".join("• " + _e(f) for f in flags)))
    if result.get("authentic_alternative"):
        blocks.append("📖 <b>%s</b>\n%s" % (ui("authentic_alt", lang), _e(result["authentic_alternative"])))
    refs = []
    for r in result.get("references") or []:
        url = str(r.get("url") or "")
        name = _e(r.get("source") or url)
        line = '• <a href="%s">%s</a>' % (html.escape(url, quote=True), name) if url.startswith("http") else "• " + name
        if r.get("description"):
            line += " - " + _e(r["description"])
        refs.append(line)
    if refs:
        blocks.append("🔗 <b>%s</b>\n%s" % (ui("sources", lang), "\n".join(refs)))
    if result.get("suggested_comment"):
        blocks.append("💬 %s\n<code>%s</code>" % (ui("comment", lang), _e(result["suggested_comment"])))
    blocks.append("<i>%s</i>\nhadithverifier.com" % ui("not_fatwa", lang))
    return blocks


def pack(blocks: list[str], limit: int = TELEGRAM_LIMIT) -> list[str]:
    """Blocks -> messages under Telegram's limit, never splitting a block (a split
    block could cut an HTML tag). A block alone over the limit is cut as plain text. PURE."""
    out, cur = [], ""
    for b in blocks:
        if len(b) > limit:
            b = _e(re.sub(r"<[^>]+>", "", html.unescape(b))[: limit - 20]) + " …"
        if cur and len(cur) + 2 + len(b) > limit:
            out.append(cur)
            cur = b
        else:
            cur = cur + "\n\n" + b if cur else b
    if cur:
        out.append(cur)
    return out


class UserLimiter:
    """At most USER_HOURLY_CAP checks per user per rolling hour (in memory)."""

    def __init__(self, cap: int = USER_HOURLY_CAP, window: float = 3600.0):
        self.cap, self.window, self.hits = cap, window, {}

    def allow(self, user_id: int, now: float | None = None) -> bool:
        now = time.time() if now is None else now
        recent = [t for t in self.hits.get(user_id, []) if now - t < self.window]
        if len(recent) >= self.cap:
            self.hits[user_id] = recent
            return False
        recent.append(now)
        self.hits[user_id] = recent
        return True


# ---- HV --------------------------------------------------------------------
async def ask_hv(client: httpx.AsyncClient, lang: str, text: str = "", image: bytes | None = None) -> tuple[int, dict]:
    headers = {"x-hv-bot-key": HV_BOT_KEY} if HV_BOT_KEY else {}
    if image is not None:
        data = {"lang": lang}
        if text:
            data["postText"] = text
        r = await client.post(HV_API_URL, data=data, files={"image": ("post.jpg", image, "image/jpeg")},
                              headers=headers)
    else:
        r = await client.post(HV_API_URL, json={"postText": text, "lang": lang}, headers=headers)
    try:
        body = r.json()
    except ValueError:
        body = {}
    return r.status_code, body


# ---- Telegram handlers -----------------------------------------------------
LIMITER = UserLimiter()


def user_lang(update, context) -> str:
    chosen = context.user_data.get("lang")
    if chosen:
        return chosen
    user = update.effective_user
    return lang_from_telegram(getattr(user, "language_code", None))


async def start(update, context):
    await update.message.reply_html(welcome_text(user_lang(update, context)), disable_web_page_preview=True)


async def set_lang(update, context):
    cmd = (update.message.text or "").split()[0].lstrip("/").split("@")[0].lower()
    lang = LANG_COMMANDS.get(cmd)
    if not lang:
        return
    context.user_data["lang"] = lang
    await update.message.reply_html("✓ %s: <b>%s</b>" % (ui("reply_lang", lang), html.escape(LANG_NAMES[lang])))


async def analyze(update, context):
    msg = update.message
    text = msg.text or msg.caption or ""
    has_image = bool(msg.photo) or bool(msg.document and (msg.document.mime_type or "").startswith("image/"))
    has_video = bool(msg.video or msg.video_note or msg.animation or msg.voice or msg.audio)
    kind = classify_input(text, has_image, has_video)

    default_lang = user_lang(update, context)
    lang = context.user_data.get("lang") or detect_post_lang(text) or default_lang

    if kind == "too_short":
        await msg.reply_text(ui("too_short", lang))
        return
    if kind == "video_only":
        await msg.reply_text(ui("no_media", lang))
        return
    if not LIMITER.allow(update.effective_user.id):
        await msg.reply_text(ui("user_limit", lang))
        return

    await context.bot.send_chat_action(chat_id=msg.chat_id, action="typing")
    status = await msg.reply_text(ui("checking", lang))
    try:
        image = None
        if kind == "image":
            f = await (msg.photo[-1].get_file() if msg.photo else msg.document.get_file())
            image = bytes(await f.download_as_bytearray())
        async with httpx.AsyncClient(timeout=120) as client:
            code, body = await ask_hv(client, lang, text=text, image=image)
        if code == 429 and body.get("error"):
            await status.edit_text(str(body["error"]))
            return
        if code != 200 or body.get("error") or not body.get("verdict"):
            logger.error("HV answered %s: %s", code, str(body)[:300])
            await status.edit_text(ui("failed", lang))
            return
        messages = pack(format_blocks(body, lang))
        await status.edit_text(messages[0], parse_mode="HTML", disable_web_page_preview=True)
        for m in messages[1:]:
            await msg.reply_html(m, disable_web_page_preview=True)
    except Exception as e:                                   # one user's failure never stops the bot
        logger.exception("analysis failed: %s", e)
        try:
            await status.edit_text(ui("failed", lang))
        except Exception:
            pass


def main():
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    from telegram import Update
    from telegram.ext import Application, CommandHandler, MessageHandler, filters

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler(["start", "help"], start))
    app.add_handler(CommandHandler(list(LANG_COMMANDS), set_lang))
    # Private chats only: in a group the bot would answer every message.
    app.add_handler(MessageHandler(filters.ChatType.PRIVATE & ~filters.COMMAND, analyze))
    logger.info("Hadith Verifier bot running -> %s (bot key %s)", HV_API_URL, "set" if HV_BOT_KEY else "not set")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
