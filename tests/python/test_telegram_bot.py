"""P396: telegram_bot.py - the pure parts, offline (no Telegram, no HV, no network).

Run: python -m pytest tests/python/test_telegram_bot.py
"""
import asyncio
import importlib.util
import os

import httpx

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("telegram_bot", os.path.join(HERE, "..", "..", "telegram_bot.py"))
bot = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bot)


# ---- languages ---------------------------------------------------------------
def test_telegram_interface_language_maps_to_hv_reply_language():
    assert bot.lang_from_telegram("ru") == "ru"
    assert bot.lang_from_telegram("tg") == "tj"          # Telegram says tg, HV says tj
    assert bot.lang_from_telegram("uz") == "uz"
    assert bot.lang_from_telegram("en-US") == "en"
    assert bot.lang_from_telegram(None) == "en"
    assert bot.lang_from_telegram("de") == "en"


def test_a_reply_goes_in_the_language_of_the_post():
    assert bot.detect_post_lang("Расулуллоҳ соллаллоҳу алайҳи васаллам айтдилар: ким ухлашдан олдин ўқиса") == "uz"
    assert bot.detect_post_lang("Паёмбар (с) фармуданд: ҳар кӣ пеш аз хоб сураи Ихлосро се бор бихонад") == "tj"
    assert bot.detect_post_lang("Пророк, мир ему, сказал: кто прочитает эту суру семь раз перед сном") == "ru"
    assert bot.detect_post_lang("Rasululloh aytdilar: kim uxlashdan oldin 4 marta Fotiha oʻqisa savob yoziladi va bilan") == "uz_latin"
    assert bot.detect_post_lang("The Prophet said whoever reads this dua seven times will be forgiven") == "en"


def test_arabic_alone_does_not_decide_the_reply_language():
    assert bot.detect_post_lang("قال رسول الله صلى الله عليه وسلم من قرأ") is None
    assert bot.detect_post_lang("") is None


# ---- input ---------------------------------------------------------------------
def test_what_the_user_sent():
    assert bot.classify_input("", has_image=True, has_video=False) == "image"
    assert bot.classify_input("Пророк сказал: кто прочитает эту суру", False, False) == "text"
    assert bot.classify_input("https://www.instagram.com/reel/DeuKjPEBFKT/", False, False) == "video_only"
    assert bot.classify_input("", False, has_video=True) == "video_only"
    assert bot.classify_input("ok", False, False) == "too_short"


def test_a_link_with_the_post_text_is_checked_as_text():
    t = "Смотрите! Пророк сказал: кто прочитает эту суру 7 раз https://www.tiktok.com/@x/video/1"
    assert bot.classify_input(t, False, False) == "text"


# ---- answer --------------------------------------------------------------------
RESULT = {
    "verdict": "fabricated", "confidence": "high",
    "claim_summary": "Reading <Fatiha> 4 times = 4000 days_of_charity *reward*",
    "analysis": "No isnad & no collection.",
    "red_flags": ["Reward inflation", "  "],
    "authentic_alternative": "Fatiha is the greatest surah (Bukhari 4474).",
    "references": [{"source": "Sahih al-Bukhari", "url": "https://sunnah.com/bukhari:4474",
                    "description": "the greatest surah", "authority": "tier1"},
                   {"source": "No link", "url": "", "description": "", "authority": "tier3"}],
    "suggested_comment": "Assalamu alaykum <3 - please check before sharing.",
}


def test_every_model_string_is_escaped():
    text = "\n\n".join(bot.format_blocks(RESULT, "en"))
    assert "&lt;Fatiha&gt;" in text and "&amp; no collection" in text and "&lt;3" in text
    assert "<Fatiha>" not in text
    assert "days_of_charity *reward*" in text            # Markdown characters are harmless in HTML


def test_the_answer_has_the_verdict_sources_comment_and_the_not_a_fatwa_line():
    blocks = bot.format_blocks(RESULT, "ru")
    text = "\n\n".join(blocks)
    assert "Выдуманный" in text
    assert '<a href="https://sunnah.com/bukhari:4474">Sahih al-Bukhari</a>' in text
    assert "• No link" in text                           # no url -> no link, still listed
    assert "<code>Assalamu alaykum &lt;3" in text
    assert "не фетва" in blocks[-1]
    assert text.count("• ") == 1 + 2                     # the empty red flag is dropped


def test_every_language_has_every_string():
    for key, table in bot.UI.items():
        if key == "verdict":
            for v, names in table.items():
                assert set(names) == set(bot.LANGS), (key, v)
        else:
            assert set(table) == set(bot.LANGS), key


def test_long_answers_split_between_blocks_never_inside_one():
    blocks = ["<b>a</b>" + "x" * 1500, "<i>b</i>" + "y" * 1500, "<code>c</code>" + "z" * 1500]
    msgs = bot.pack(blocks, limit=3200)
    assert len(msgs) == 2 and msgs[0].endswith("x" * 1500 + "\n\n<i>b</i>" + "y" * 1500)
    assert all(len(m) <= 3200 for m in msgs)


def test_a_block_over_the_limit_is_cut_as_plain_text():
    msgs = bot.pack(["<code>" + "q" * 5000 + "</code>"], limit=4000)
    assert len(msgs) == 1 and len(msgs[0]) <= 4000 and "<code>" not in msgs[0]


def test_ten_checks_an_hour_per_user():
    lim = bot.UserLimiter(cap=10, window=3600)
    assert all(lim.allow(1, now=100 + i) for i in range(10))
    assert not lim.allow(1, now=200)
    assert lim.allow(2, now=200)                         # another user is not affected
    assert lim.allow(1, now=100 + 3601)                  # the hour rolls on


# ---- HV request ------------------------------------------------------------------
def _client(seen):
    def handler(request: httpx.Request):
        seen.append(request)
        return httpx.Response(200, json={"verdict": "authentic"})
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_text_goes_as_json_with_the_bot_key(monkeypatch):
    monkeypatch.setattr(bot, "HV_BOT_KEY", "k123")
    seen = []
    async def run():
        async with _client(seen) as c:
            return await bot.ask_hv(c, "tj", text="матн")
    code, body = asyncio.run(run())
    assert code == 200 and body["verdict"] == "authentic"
    req = seen[0]
    assert req.headers["x-hv-bot-key"] == "k123"
    assert req.headers["content-type"].startswith("application/json")
    assert b'"lang":"tj"' in req.content.replace(b" ", b"")


def test_a_photo_goes_as_multipart_with_its_caption(monkeypatch):
    monkeypatch.setattr(bot, "HV_BOT_KEY", "")
    seen = []
    async def run():
        async with _client(seen) as c:
            return await bot.ask_hv(c, "ru", text="подпись", image=b"\xff\xd8jpeg")
    asyncio.run(run())
    req = seen[0]
    assert "x-hv-bot-key" not in req.headers                 # no key configured -> no header
    assert req.headers["content-type"].startswith("multipart/form-data")
    assert b'name="image"' in req.content and "подпись".encode() in req.content


# ---- the handler, with fake Telegram objects ---------------------------------------
class _Msg:
    def __init__(self, text=None, caption=None, photo=None):
        self.text, self.caption, self.photo = text, caption, photo or []
        self.document = self.video = self.video_note = self.animation = self.voice = self.audio = None
        self.chat_id = 7
        self.sent = []

    async def reply_text(self, text, **kw):
        m = _Msg(text=text); self.sent.append(("reply", text, kw)); m.parent = self
        return m

    async def reply_html(self, text, **kw):
        self.sent.append(("html", text, kw))

    async def edit_text(self, text, **kw):
        self.parent.sent.append(("edit", text, kw))


class _Bot:
    async def send_chat_action(self, **kw):
        pass


def _update(msg, code="ru", uid=1):
    from types import SimpleNamespace as NS
    return NS(message=msg, effective_user=NS(id=uid, language_code=code))


def _context():
    from types import SimpleNamespace as NS
    return NS(user_data={}, bot=_Bot())


def test_the_handler_answers_in_the_posts_language_with_html(monkeypatch):
    async def fake_hv(client, lang, text="", image=None):
        assert lang == "tj" and image is None
        return 200, dict(RESULT)
    monkeypatch.setattr(bot, "ask_hv", fake_hv)
    monkeypatch.setattr(bot, "LIMITER", bot.UserLimiter())
    msg = _Msg(text="Паёмбар (с) фармуданд: ҳар кӣ пеш аз хоб сураи Ихлосро се бор бихонад")
    asyncio.run(bot.analyze(_update(msg, code="ru"), _context()))
    kinds = [s[0] for s in msg.sent]
    assert kinds[:2] == ["reply", "edit"]                    # "checking..." then the answer in its place
    edit = msg.sent[1]
    assert edit[2]["parse_mode"] == "HTML" and "Сохта" in edit[1] and "фатво" in edit[1]


def test_the_handler_passes_on_the_sites_rate_limit_message(monkeypatch):
    async def fake_hv(client, lang, text="", image=None):
        return 429, {"error": "Суточный лимит исчерпан. Попробуйте завтра."}
    monkeypatch.setattr(bot, "ask_hv", fake_hv)
    monkeypatch.setattr(bot, "LIMITER", bot.UserLimiter())
    msg = _Msg(text="Пророк, мир ему, сказал: кто прочитает эту суру семь раз перед сном")
    asyncio.run(bot.analyze(_update(msg), _context()))
    assert msg.sent[-1][1] == "Суточный лимит исчерпан. Попробуйте завтра."


def test_a_video_link_alone_gets_the_not_yet_answer_without_calling_hv(monkeypatch):
    async def fake_hv(*a, **k):
        raise AssertionError("HV must not be called")
    monkeypatch.setattr(bot, "ask_hv", fake_hv)
    msg = _Msg(text="https://www.instagram.com/reel/DeuKjPEBFKT/")
    asyncio.run(bot.analyze(_update(msg, code="uz"), _context()))
    assert "Видео" in msg.sent[0][1]


def test_links_and_hashtags_do_not_make_a_post_english():
    assert bot.detect_post_lang("https://www.instagram.com/reel/DeuKjPEBFKT/?igsh=abcdefghijklmnop") is None
    assert bot.detect_post_lang("Пророк сказал: кто прочитает суру #hadith #islam #sunnah #quran https://t.me/x") == "ru"
