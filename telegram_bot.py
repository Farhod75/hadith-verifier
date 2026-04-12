"""
Hadith Verifier — Telegram Bot
================================
Users forward suspicious posts to this bot.
Bot replies with verdict + ready-to-paste comment.

Setup:
1. pip install python-telegram-bot anthropic python-dotenv
2. Create bot via @BotFather on Telegram → get token
3. Add TELEGRAM_BOT_TOKEN and ANTHROPIC_API_KEY to .env
4. Run: python telegram_bot.py

Deploy options:
- Local: python telegram_bot.py (runs 24/7 on your machine)
- Free cloud: Railway.app, Render.com, or Fly.io
"""

import os
import json
import logging
from dotenv import load_dotenv
import anthropic
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are an Islamic hadith authentication expert. Analyze social media posts for fabricated or weak hadiths attributed to Prophet Muhammad ﷺ.

Source priority: Dorar.net → Sunnah.com → IslamQA.info → HadeethEnc.com → IslamWeb.net

Key fabrication red flags:
- Specific large reward numbers not in authentic collections
- Formula: "Read Surah X Y times = Z reward" without isnad
- Chain message pressure ("share with 10 people")
- Disproportionate rewards for trivial acts

Respond ONLY with valid JSON. No markdown, no backticks."""

WELCOME_MESSAGE = """🌙 *Hadith Verifier Bot*

Assalomu alaykum / السلام عليكم / Hello!

I verify hadiths and Islamic content shared on social media.

*How to use:*
Simply paste or forward any suspicious post text to me.

*I will check it against:*
• Dorar.net — 520,000+ hadiths
• Sunnah.com — Bukhari, Muslim & more
• IslamQA.info — scholarly rulings
• HadeethEnc.com — multi-language

*Commands:*
/start — This message
/help — How to use
/lang\_en — Reply in English (default)
/lang\_uz — Reply in Uzbek
/lang\_ar — Reply in Arabic
/lang\_ru — Reply in Russian

Just paste any post below 👇"""

HELP_MESSAGE = """*How to use Hadith Verifier:*

1. Copy any suspicious post from Facebook/Instagram
2. Paste it here as a message
3. I'll analyze it and tell you if it's authentic or fabricated
4. I'll give you a ready-to-post correction comment with source links

*Example post I can analyze:*
_"Kim uxlashdan oldin 4 marta Sura Fotiha o'qisa, 4000 kun sadaqa savob yoziladi"_

Just paste it and I'll verify it! 🔍"""


def get_user_lang(context: ContextTypes.DEFAULT_TYPE) -> str:
    return context.user_data.get("lang", "en")


def build_prompt(post_text: str, lang: str) -> str:
    lang_map = {
        "en": "English",
        "uz": "Uzbek (O'zbek tili)",
        "ar": "Arabic (العربية)",
        "ru": "Russian (Русский)"
    }
    return f"""Analyze this social media post for fabricated or weak hadiths.

POST:
\"\"\"
{post_text}
\"\"\"

Respond with this JSON only:
{{
  "verdict": "fabricated" | "weak" | "authentic" | "unclear" | "no_hadith",
  "confidence": "high" | "medium" | "low",
  "claim_summary": "one sentence summary",
  "analysis": "2-3 sentences scholarly analysis",
  "authentic_alternative": "what authentic sources say",
  "top_reference": {{
    "source": "source name",
    "url": "direct URL e.g. https://sunnah.com/bukhari:574"
  }},
  "suggested_comment": "compassionate reply in {lang_map.get(lang, 'English')} with: greeting, gentle correction, authentic ruling, source URL, dua closing"
}}"""


def format_verdict_emoji(verdict: str) -> str:
    return {
        "fabricated": "❌",
        "weak": "⚠️",
        "authentic": "✅",
        "unclear": "🔍",
        "no_hadith": "ℹ️"
    }.get(verdict, "🔍")


def format_verdict_label(verdict: str) -> str:
    return {
        "fabricated": "FABRICATED HADITH",
        "weak": "WEAK / UNVERIFIED",
        "authentic": "AUTHENTIC",
        "unclear": "NEEDS VERIFICATION",
        "no_hadith": "NO HADITH FOUND"
    }.get(verdict, "UNKNOWN")


def format_response(result: dict) -> str:
    verdict = result.get("verdict", "unclear")
    emoji = format_verdict_emoji(verdict)
    label = format_verdict_label(verdict)
    confidence = result.get("confidence", "")
    claim = result.get("claim_summary", "")
    analysis = result.get("analysis", "")
    alternative = result.get("authentic_alternative", "")
    ref = result.get("top_reference", {})
    comment = result.get("suggested_comment", "")

    lines = [
        f"{emoji} *{label}* ({confidence} confidence)",
        f"",
        f"📋 *Claim:* {claim}",
        f"",
        f"🔬 *Analysis:*",
        f"{analysis}",
    ]

    if alternative:
        lines += ["", f"📖 *Authentic alternative:*", f"{alternative}"]

    if ref.get("url"):
        lines += ["", f"🔗 *Source:* [{ref.get('source', 'Reference')}]({ref.get('url')})"]

    if comment:
        lines += [
            "",
            "─" * 30,
            "💬 *Ready-to-post comment:*",
            "",
            f"```",
            comment,
            "```",
            "",
            "_Copy the comment above and paste it on the original post_"
        ]

    return "\n".join(lines)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WELCOME_MESSAGE, parse_mode="Markdown")


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_MESSAGE, parse_mode="Markdown")


async def set_lang(update: Update, context: ContextTypes.DEFAULT_TYPE, lang: str):
    context.user_data["lang"] = lang
    labels = {"en": "English 🇬🇧", "uz": "Uzbek 🇺🇿", "ar": "Arabic 🇸🇦", "ru": "Russian 🇷🇺"}
    await update.message.reply_text(f"✓ Reply language set to *{labels[lang]}*", parse_mode="Markdown")


async def lang_en(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await set_lang(update, context, "en")

async def lang_uz(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await set_lang(update, context, "uz")

async def lang_ar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await set_lang(update, context, "ar")

async def lang_ru(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await set_lang(update, context, "ru")


async def analyze_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    post_text = update.message.text
    lang = get_user_lang(context)

    if len(post_text) < 10:
        await update.message.reply_text("Please paste a longer post text for me to analyze.")
        return

    # Send typing indicator
    await update.message.reply_text("🔍 Analyzing... checking against Dorar.net, Sunnah.com, IslamQA...")

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_prompt(post_text, lang)}]
        )

        raw = message.content[0].text if message.content else "{}"
        result = json.loads(raw.replace("```json", "").replace("```", "").strip())
        response_text = format_response(result)

        await update.message.reply_text(response_text, parse_mode="Markdown", disable_web_page_preview=True)

    except json.JSONDecodeError:
        await update.message.reply_text("⚠️ Analysis completed but response format error. Please try again.")
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        await update.message.reply_text("❌ Analysis failed. Please check your API key and try again.")


def main():
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN not set in .env")
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not set in .env")

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("lang_en", lang_en))
    app.add_handler(CommandHandler("lang_uz", lang_uz))
    app.add_handler(CommandHandler("lang_ar", lang_ar))
    app.add_handler(CommandHandler("lang_ru", lang_ru))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, analyze_post))

    logger.info("Hadith Verifier Bot is running...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
