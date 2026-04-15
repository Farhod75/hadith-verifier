# tests/python/test_analyze_api.py
# Python pytest suite for Hadith Verifier API
# CT-GenAI Certification Portfolio — AI Output Verification
# Covers: schema validation, AI quality, hallucination, language, severity

import os
import re
import pytest
import httpx

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
TIMEOUT = 90.0

VALID_VERDICTS = {"fabricated", "weak", "authentic", "unclear", "no_hadith"}
VALID_CONFIDENCE = {"high", "medium", "low"}
VALID_SEVERITY = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
VALID_AUTHORITY = {"tier1", "tier2", "tier3"}
VALID_SOURCE_DOMAINS = [
    "sunnah.com",
    "dorar.net",
    "islamqa.info",
    "hadeethenc.com",
    "islamweb.net",
    "yaqeeninstitute.org",
    "islamhouse.com",
]

CYRILLIC = re.compile(r"[\u0400-\u04FF]")
ARABIC = re.compile(r"[\u0600-\u06FF]")

# ─────────────────────────────────────────────────────────────
# TEST DATA
# ─────────────────────────────────────────────────────────────
FABRICATED_UZBEK = """Мусулмонлар диққат билан эшитинг
Расул (с.а.в) айтдилар:
Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа қилган савоби ёзилади.
Бу видеони улашиб, бошқаларга ҳам билиш имконини яратиб беринг."""

FABRICATED_CHAIN = """URGENT SHARE: Prophet said whoever reads this dua 7 times
and shares with 10 people tonight, Allah will forgive ALL their sins
and open the gates of Jannah. Don't break the chain! Share NOW!"""

FABRICATED_ARABIC = """من قرأ سورة الفاتحة 4 مرات قبل النوم كتب له ثواب 4000 يوم صدقة
شاركها مع 10 أشخاص ولا تكسر السلسلة"""

FABRICATED_RUSSIAN = """Пророк сказал: Кто прочитает суру Аль-Фатиха 4 раза перед сном,
тому запишется награда 4000 дней садака. Перешли 10 людям!"""

AUTHENTIC_BUKHARI = """The Messenger of Allah said:
'Whoever prays Fajr and Asr will enter Paradise.'
— Sahih al-Bukhari 574, Sahih Muslim 635"""

NO_HADITH_POST = "Assalamu Alaikum everyone! Hope you are having a blessed Friday."


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def post_analyze(post_text: str, lang: str = "en") -> dict:
    """POST to /api/analyze and return parsed JSON body."""
    res = httpx.post(
        f"{BASE_URL}/api/analyze",
        json={"postText": post_text, "lang": lang},
        timeout=TIMEOUT,
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    return res.json()


def get_severity(verdict: str, confidence: str) -> str:
    """Mirror the severity logic from route.ts."""
    if verdict == "fabricated" and confidence == "high":
        return "CRITICAL"
    if verdict == "fabricated" and confidence in ("medium", "low"):
        return "HIGH"
    if verdict == "weak" and confidence == "high":
        return "HIGH"
    if verdict == "weak":
        return "MEDIUM"
    if verdict in ("authentic", "no_hadith"):
        return "LOW"
    return "MEDIUM"


# ─────────────────────────────────────────────────────────────
# SUITE 1: Request validation
# ─────────────────────────────────────────────────────────────
class TestRequestValidation:

    def test_empty_post_text_returns_400(self):
        res = httpx.post(
            f"{BASE_URL}/api/analyze",
            json={"postText": "", "lang": "en"},
            timeout=TIMEOUT,
        )
        assert res.status_code == 400

    def test_missing_post_text_returns_400(self):
        res = httpx.post(
            f"{BASE_URL}/api/analyze",
            json={"lang": "en"},
            timeout=TIMEOUT,
        )
        assert res.status_code == 400

    def test_valid_input_returns_200(self):
        res = httpx.post(
            f"{BASE_URL}/api/analyze",
            json={"postText": FABRICATED_CHAIN, "lang": "en"},
            timeout=TIMEOUT,
        )
        assert res.status_code == 200


# ─────────────────────────────────────────────────────────────
# SUITE 2: Response schema validation (CT-GenAI)
# ─────────────────────────────────────────────────────────────
class TestResponseSchema:

    def test_all_required_fields_present(self):
        body = post_analyze(FABRICATED_CHAIN)
        assert "verdict" in body
        assert "confidence" in body
        assert "claim_summary" in body
        assert "analysis" in body
        assert "suggested_comment" in body
        assert "red_flags" in body
        assert "references" in body

    def test_verdict_is_valid_enum(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert body["verdict"] in VALID_VERDICTS

    def test_confidence_is_valid_enum(self):
        body = post_analyze(FABRICATED_CHAIN)
        assert body["confidence"] in VALID_CONFIDENCE

    def test_red_flags_is_list(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert isinstance(body["red_flags"], list)

    def test_references_is_list(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert isinstance(body["references"], list)

    def test_references_have_required_fields(self):
        body = post_analyze(FABRICATED_UZBEK)
        if body["references"]:
            ref = body["references"][0]
            assert "source" in ref
            assert "url" in ref
            assert "authority" in ref
            assert ref["authority"] in VALID_AUTHORITY

    def test_severity_field_is_valid_enum(self):
        body = post_analyze(FABRICATED_CHAIN)
        if "severity" in body and body["severity"]:
            assert body["severity"] in VALID_SEVERITY

    def test_claim_summary_is_string(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert isinstance(body["claim_summary"], str)
        assert len(body["claim_summary"]) > 5

    def test_analysis_is_meaningful_text(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert isinstance(body["analysis"], str)
        assert len(body["analysis"]) > 50
        assert "[placeholder]" not in body["analysis"]


# ─────────────────────────────────────────────────────────────
# SUITE 3: AI quality tests (CT-GenAI)
# ─────────────────────────────────────────────────────────────
class TestAIQuality:

    def test_uzbek_fabricated_post_detected(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert body["verdict"] in ("fabricated", "weak")

    def test_chain_message_detected(self):
        body = post_analyze(FABRICATED_CHAIN)
        assert body["verdict"] in ("fabricated", "weak")

    def test_authentic_bukhari_returns_valid_verdict(self):
        body = post_analyze(AUTHENTIC_BUKHARI)
        assert body["verdict"] in VALID_VERDICTS
        assert len(body["analysis"]) > 20

    def test_chain_message_flags_chain_keywords(self):
        body = post_analyze(FABRICATED_CHAIN)
        all_content = " ".join([
            " ".join(body.get("red_flags", [])),
            body.get("analysis", ""),
            body.get("claim_summary", ""),
        ]).lower()
        has_chain_flag = any(k in all_content for k in [
            "chain", "share", "pressure", "forward"
        ])
        assert has_chain_flag

    def test_arabic_fabricated_post_detected(self):
        body = post_analyze(FABRICATED_ARABIC, lang="ar")
        assert body["verdict"] in ("fabricated", "weak", "unclear")

    def test_russian_fabricated_post_detected(self):
        body = post_analyze(FABRICATED_RUSSIAN, lang="ru")
        assert body["verdict"] in ("fabricated", "weak", "unclear")


# ─────────────────────────────────────────────────────────────
# SUITE 4: Hallucination detection (CT-GenAI)
# ─────────────────────────────────────────────────────────────
class TestHallucinationDetection:

    def test_reference_urls_from_valid_domains(self):
        body = post_analyze(FABRICATED_UZBEK)
        for ref in body.get("references", []):
            url = ref.get("url", "")
            if url.startswith("http"):
                assert any(domain in url for domain in VALID_SOURCE_DOMAINS), \
                    f"Hallucinated URL detected: {url}"

    def test_suggested_comment_not_empty(self):
        body = post_analyze(FABRICATED_CHAIN)
        assert body["suggested_comment"]
        assert len(body["suggested_comment"]) > 30
        assert body["suggested_comment"] != "undefined"

    def test_suggested_comment_no_placeholder(self):
        body = post_analyze(FABRICATED_UZBEK)
        assert "[placeholder]" not in body["suggested_comment"]
        assert "undefined" not in body["suggested_comment"]

    def test_no_duplicate_references(self):
        body = post_analyze(FABRICATED_UZBEK)
        urls = [r["url"] for r in body.get("references", []) if r.get("url")]
        assert len(urls) == len(set(urls)), "Duplicate reference URLs detected"


# ─────────────────────────────────────────────────────────────
# SUITE 5: Language output tests — UPDATED
# CT-GenAI: validates ALL fields not just suggested_comment
# ─────────────────────────────────────────────────────────────
class TestLanguageOutput:

    def test_uz_comment_is_uzbek(self):
        body = post_analyze(FABRICATED_CHAIN, lang="uz")
        comment = body["suggested_comment"].lower()
        has_uzbek = any(k in comment for k in [
            "assalomu", "alaykum", "alloh", "hadis",
            "rivoyat", "sahih", "islom", "uydirma", "manba"
        ]) or bool(CYRILLIC.search(comment))
        assert has_uzbek, f"No Uzbek content in comment: {comment[:200]}"

    def test_uz_analysis_is_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="uz")
        assert CYRILLIC.search(body.get("analysis", "")), \
            "UZ analysis must contain Cyrillic characters"

    def test_uz_claim_summary_is_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="uz")
        assert CYRILLIC.search(body.get("claim_summary", "")), \
            "UZ claim_summary must contain Cyrillic characters"

    def test_uz_red_flags_are_cyrillic(self):
        body = post_analyze(FABRICATED_UZBEK, lang="uz")
        if body.get("red_flags"):
            all_flags = " ".join(body["red_flags"])
            assert CYRILLIC.search(all_flags), \
                "UZ red_flags must contain Cyrillic characters"

    def test_ar_comment_has_arabic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ar")
        assert ARABIC.search(body.get("suggested_comment", "")), \
            "AR comment must contain Arabic characters"

    def test_ar_analysis_has_arabic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ar")
        assert ARABIC.search(body.get("analysis", "")), \
            "AR analysis must contain Arabic characters"

    def test_ar_claim_summary_has_arabic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ar")
        assert ARABIC.search(body.get("claim_summary", "")), \
            "AR claim_summary must contain Arabic characters"

    def test_ar_red_flags_have_arabic(self):
        body = post_analyze(FABRICATED_ARABIC, lang="ar")
        if body.get("red_flags"):
            all_flags = " ".join(body["red_flags"])
            assert ARABIC.search(all_flags), \
                "AR red_flags must contain Arabic characters"

    def test_ru_comment_has_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ru")
        assert CYRILLIC.search(body.get("suggested_comment", "")), \
            "RU comment must contain Cyrillic characters"

    def test_ru_analysis_has_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ru")
        assert CYRILLIC.search(body.get("analysis", "")), \
            "RU analysis must contain Cyrillic characters"

    def test_ru_claim_summary_has_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="ru")
        assert CYRILLIC.search(body.get("claim_summary", "")), \
            "RU claim_summary must contain Cyrillic characters"

    def test_ru_red_flags_have_cyrillic(self):
        body = post_analyze(FABRICATED_RUSSIAN, lang="ru")
        if body.get("red_flags"):
            all_flags = " ".join(body["red_flags"])
            assert CYRILLIC.search(all_flags), \
                "RU red_flags must contain Cyrillic characters"

    def test_en_comment_has_english_keywords(self):
        body = post_analyze(FABRICATED_CHAIN, lang="en")
        comment = body.get("suggested_comment", "").lower()
        has_english = any(k in comment for k in [
            "assalamu", "narration", "fabricated", "authentic", "reference"
        ])
        assert has_english, f"No English keywords in EN comment: {comment[:200]}"

    def test_en_analysis_has_no_arabic_or_cyrillic(self):
        body = post_analyze(FABRICATED_CHAIN, lang="en")
        analysis = body.get("analysis", "")
        assert not ARABIC.search(analysis), "EN analysis must not contain Arabic"
        assert not CYRILLIC.search(analysis), "EN analysis must not contain Cyrillic"


# ─────────────────────────────────────────────────────────────
# SUITE 6: Severity scoring (CT-GenAI)
# ─────────────────────────────────────────────────────────────
class TestSeverityScoring:

    def test_fabricated_high_confidence_maps_to_critical(self):
        body = post_analyze(FABRICATED_CHAIN)
        if body["verdict"] == "fabricated" and body["confidence"] == "high":
            assert get_severity(body["verdict"], body["confidence"]) == "CRITICAL"

    def test_chain_message_severity_critical_or_high(self):
        body = post_analyze(FABRICATED_CHAIN)
        severity = get_severity(body["verdict"], body["confidence"])
        assert severity in ("CRITICAL", "HIGH")

    def test_authentic_verdict_maps_to_low(self):
        body = post_analyze(AUTHENTIC_BUKHARI)
        if body["verdict"] == "authentic":
            assert get_severity(body["verdict"], body["confidence"]) == "LOW"

    def test_no_hadith_maps_to_low(self):
        body = post_analyze(NO_HADITH_POST)
        if body["verdict"] == "no_hadith":
            assert get_severity(body["verdict"], body["confidence"]) == "LOW"

    def test_authentic_verdict_never_critical_or_high(self):
        body = post_analyze(AUTHENTIC_BUKHARI)
        if body["verdict"] == "authentic":
            severity = get_severity(body["verdict"], body["confidence"])
            assert severity not in ("CRITICAL", "HIGH")

    def test_severity_enum_valid_if_present_in_response(self):
        body = post_analyze(FABRICATED_UZBEK)
        if body.get("severity"):
            assert body["severity"] in VALID_SEVERITY


# ─────────────────────────────────────────────────────────────
# SUITE 7: Admin queue API
# ─────────────────────────────────────────────────────────────
class TestAdminQueue:

    def test_get_queue_returns_200(self):
        res = httpx.get(f"{BASE_URL}/api/queue", timeout=TIMEOUT)
        assert res.status_code == 200

    def test_get_queue_returns_list(self):
        res = httpx.get(f"{BASE_URL}/api/queue", timeout=TIMEOUT)
        body = res.json()
        assert isinstance(body, list)

    def test_queue_records_have_required_fields(self):
        res = httpx.get(f"{BASE_URL}/api/queue", timeout=TIMEOUT)
        body = res.json()
        if body:
            record = body[0]
            assert "id" in record
            assert "verdict" in record
            assert "post_text" in record
            assert "created_at" in record

    def test_queue_records_have_valid_verdict(self):
        res = httpx.get(f"{BASE_URL}/api/queue", timeout=TIMEOUT)
        body = res.json()
        if body:
            assert body[0]["verdict"] in VALID_VERDICTS