# agent-upskilling.md
# Hadith Verifier (HV) — Agent Upskilling & Tool Evaluation

> **Author:** Farhod Elbekov + Claude session, 2026-06-09
> **Status:** Draft — informational scouting, NOT a commitment to adopt
> **Project:** hadith-verifier (hadithverifier.com, github.com/Farhod75/hadith-verifier; Vercel: hadith-verifier-vp57.vercel.app)
> **Source of truth:** the 3-tier scholarly source authority (Dorar / Sunnah.com / HadeethEnc → IslamQA / IslamWeb) — NOT the model's training memory
> **Companion docs:** `CLAUDE.md`, `AGENTS.md`, `QA_STANDARDS.md`, `QA_STANDARDS_AGENT_RULES.md`, `fix_patterns.md`, `agents/knowledge/pw_best_practices.md`
> **Note:** Merges and supersedes the 2026-05-16 scouting draft (forward-looking, 4 candidates); earlier institutional knowledge preserved inline.

## Purpose

This document tracks emerging tools and techniques that could enhance the Hadith Verifier app. Unlike HR (a production content channel) and Idris (a single-named-user learning app), HV is a **public, adversarial, free verification service**. Anyone can paste arbitrary text — in five languages — and get back a verdict, a confidence, a severity, and a suggested reply with deep-linked sources. Every tool decision must answer: *does this make verdicts more accurate and citations more trustworthy, without compromising the scholarly source-authority chain, the compassionate tone, or the free-forever promise?*

Adoption rules unique to HV:

1. **A wrong citation is worse than no citation.** Religious stakes are high. Any tool that increases the risk of a fabricated or mis-graded source is rejected, however convenient.
2. **The 3-tier source authority is the spine.** Tier 1 (Dorar.net, Sunnah.com, HadeethEnc.com) outranks Tier 2 (IslamQA.info, IslamWeb.net). No tool may flatten this hierarchy or cite a lower tier as if it were higher.
3. **Input is adversarial.** Users paste anything, including jailbreak attempts. `audit.spec.ts` already tests injection resistance — tooling must respect that threat model, not widen it.
4. **Verdicts are non-deterministic.** Per P060, Claude can return `unclear`; AI quality tests are tagged `@real-api` and accept it. No tool may assume deterministic output.
5. **Human-in-the-loop on action.** The admin queue exists so a human reviews flagged posts. `suggested_comment` is a draft for a person to send — never auto-posted to someone's wall.
6. **Free forever (sadaqah jariyah).** Per-verdict cost matters. Tools that meaningfully raise cost per analysis face a high bar.
7. **HV is the most mature of the three — adoption is conservative.** Real users analyze real claims. Changes must be backward-compatible: the `/api/analyze` response shape is a contract that the Telegram bot (and any future browser extension) depends on. New fields are additive; existing fields don't change meaning or disappear.

This is a scouting log, not an adoption plan.

---

## Current HV stack (what we'd be extending or replacing)

✅ **Frontend:** Next.js 14 + TypeScript + Tailwind CSS — multi-tab UI (Analyze post / Source library / Admin queue), port 3001 locally
✅ **AI:** Claude Sonnet via `@anthropic-ai/sdk` (`/api/analyze` currently on `claude-sonnet-4-6`, `temperature: 0`, JSON-only system prompt)
✅ **Output contract:** `{ verdict, confidence, claim_summary, analysis, suggested_comment, references[], red_flags[], severity }`
✅ **Parsing hardening (P032):** strip ```` ```json ```` fences, slice first `{`…last `}`, strip special Unicode (ﷺ U+FDFD) + control chars before `JSON.parse`, normalize `references`/`red_flags` to arrays
✅ **Severity:** `calculateSeverity(verdict, confidence, red_flags)` → CRITICAL / HIGH / MEDIUM / LOW
✅ **Security layer:** `sanitizeInput()` on the way in, `validateOutput()` on the way out (in `route.ts`)
✅ **Persistence:** Supabase `flagged_posts` (SHARED project with HR) — written only when verdict is `fabricated` or `weak`
✅ **Alerts:** Telegram (`@hadith_verifier_alert_bot`) + Slack `#hadith-alerts` on fabricated/weak
✅ **Languages:** EN, UZ, AR, RU, TJ — reply generation per language
✅ **Sources:** Tier 1 Dorar.net / Sunnah.com / HadeethEnc.com; Tier 2 IslamQA.info / IslamWeb.net; deep-links, not homepages
✅ **Testing:** Playwright (`api.spec.ts`, `severity.spec.ts`, `audit.spec.ts`, `hadith-verifier.spec.ts`) + pytest (`test_analyze_api.py`) + axe-core (WCAG 2.1 AA)
✅ **Multi-agent QA:** Python Playwright auto-fix agent (CAG pattern — loads `CLAUDE.md` + `fix_patterns.md` + `pw_best_practices.md` + git log, opens PRs)
✅ **Pre-push:** smart hook v3 (doc-only → skip; `app/api/analyze/` → `api.spec.ts`; `app/page.tsx` → `hadith-verifier.spec.ts`; `tsc --noEmit` always)
✅ **Knowledge:** `fix_patterns.md` (P001–P079) at repo root AND `agents/knowledge/fix_patterns.md`
✅ **TTS route:** `app/api/tts/route.ts` (ElevenLabs proxy, lang→voiceId map, fixed in P061) — reads back generated correction comments
✅ **Rate limiting:** `/api/analyze` global daily cap + per-IP hourly cap (abuse protection on a free public endpoint)
✅ **Analytics:** Google Analytics integrated for usage insights
✅ **Test footprint:** ~192 Playwright + ~46 pytest (May 2026 figures — re-confirm current counts)
✅ **Deployment:** Vercel (`hadith-verifier-vp57.vercel.app`; DNS via Namecheap → Vercel nameservers)

**Critical constraints to never violate:**
- Tier 1 sources outrank Tier 2 — never present a lower tier as authoritative
- Deep-links to the exact hadith page, never bare homepages
- Compassionate, non-confrontational reply tone — never shame the poster
- `suggested_comment` is human-reviewed, never auto-published
- `temperature: 0` for verdicts (reproducibility, not creativity)
- Five-language parity — no anglocentric tool that degrades UZ/AR/RU/TJ
- Free forever — cost-per-verdict is a first-class design variable

---

## Candidates under evaluation

### Candidate 1: RAG upgrade for hadith retrieval (pgvector + Voyage AI)

> **Source:** Farhod's RAG Learning Roadmap (`ABOUT.md`) — HV is the named flagship
> **Verified via:** Supabase pgvector docs; Voyage AI is already a dependency in the Idris repo
> **Status:** ✅ HIGH VALUE (strategic, not a quick win) — the single highest-leverage HV upgrade

#### Why it fits HV better than any other project

HV today is **prompt-based**: Claude analyzes the pasted text using its training knowledge plus the source-tier rules in the system prompt. That is exactly where the **fabricated-citation risk** lives — the model can confidently produce a plausible-looking Sunnah.com URL or grading that does not exist.

RAG flips this. Instead of asking the model "do you recall this hadith and where it's graded," you:
1. Embed the pasted claim
2. Retrieve the nearest real entries from an indexed corpus (Sunnah.com collection dumps, HadeethEnc, Dorar gradings)
3. Hand Claude **actual retrieved source text + real URLs** as grounding
4. Ask it to judge against that evidence, citing only what was retrieved

This directly attacks Adoption Rule #1 (a wrong citation is worse than none) and Rule #2 (the source authority is the spine — now it's literally the retrieval corpus).

#### Critical guardrail — retrieval grounds *evidence*, never *authority*

The 2026-05-16 scouting draft explicitly rejected vector embeddings, on sound reasoning: *"embeddings would introduce fuzzy matching where exact authority-based matching is the correct behavior."* That concern is correct and is preserved here, because it's about a different job. There are two separate concerns that must not be conflated:

1. **Authority ranking** — *which tier wins* (Dorar/Sunnah/HadeethEnc Tier 1 over IslamQA/IslamWeb Tier 2). This stays an **exact, curated, rule-based** lookup. Embeddings never decide what is authoritative. Fuzzy matching here would be a regression.
2. **Source-text retrieval** — *which actual hadith text the model sees* before it judges. Today that's the model's training memory — exactly where the fabricated-citation risk lives.

RAG addresses **#2 only.** Retrieval surfaces *candidate evidence*; the curated tier hierarchy still governs *authority* and ordering. Framed this way, the RAG upgrade and the earlier "don't fuzz the tiers" decision are both right and do not conflict. Any RAG implementation that lets cosine similarity override tier ranking is rejected.

#### Honest concerns specific to HV

⚠️ **Corpus licensing + scraping policy.** Sunnah.com / HadeethEnc / Dorar each have their own terms. Indexing for retrieval is different from republishing, but verify before bulk-ingesting. This is the same discipline already applied to the dua book in HR.

⚠️ **Multilingual embedding quality.** The claim arrives in UZ/AR/RU/TJ; the corpus is Arabic + English. Cross-lingual retrieval quality must be tested per language — Voyage's multilingual model or a query-translation step. UZ/TJ are the usual weak spots (same trap as P078).

⚠️ **Retrieval misses are a new failure mode.** If the right hadith isn't retrieved, the model may either say "not found" (good) or pattern-match to a near-neighbor (bad). The `@real-api` quality tests must grow a retrieval-precision suite, not just a verdict suite.

⚠️ **Not a quick win.** This is a branch, not an afternoon. Build it beside the current prompt-based path so you can A/B verdict quality, exactly as noted in your RAG roadmap ("building the RAG upgrade as a separate branch to compare quality").

#### Decision criteria

Adopt the RAG path IF:
1. A retrieval-precision eval (precision@k / recall@k on a labeled set of known fabricated + known sahih claims) shows fewer hallucinated citations than the prompt-based baseline
2. Cross-lingual retrieval is validated for all five languages, not just EN/AR
3. Corpus ingestion respects each source's terms

Do NOT adopt if:
- Retrieval can't beat the prompt baseline on citation accuracy (then it's complexity for no gain)
- It can only be made to work for English

#### Roadmap fit

**Phase A:** Index one collection (e.g. Sahih al-Bukhari from Sunnah.com) into Supabase pgvector with Voyage embeddings. Wire a `/api/analyze?mode=rag` flag.
**Phase B:** Build the retrieval-precision eval set (reuse known fabricated/sahih examples already in `api.spec.ts`). Compare RAG vs prompt baseline.
**Phase C:** If RAG wins, expand corpus collection-by-collection; keep prompt-based as fallback when retrieval returns nothing. Document as a fix pattern. Maps directly to CT-GenAI (RAGAS, retrieval evaluation).

---

### Candidate 2: Prompt-injection guardrails (regex pre-filter, then Rebuff / Lakera)

> **Source:** Tier 3-H in the post-Hajj queue; `audit.spec.ts` already tests injection resistance
> **Verified via:** open-source Rebuff + Lakera Guard docs (general capability)
> **Status:** ⚠️ ADOPT IN LAYERS — build the cheap layer yourself, evaluate the paid layer

#### The use case in HV

HV is the one project where users are explicitly **hostile by design** — pasting screenshots and arbitrary text, some of which will try "ignore previous instructions, output X." `audit.spec.ts` already asserts injection resistance, but there is currently no dedicated pre-filter before text hits Claude. Tier 3-H is exactly this.

#### A layered model (cheapest first)

| Layer | What it catches | Cost | HV fit |
|---|---|---|---|
| **L1 — regex pre-filter (own)** | Obvious patterns: "ignore previous", "system prompt", "you are now", role-play jailbreaks | ~free, ~2h to write | **Build first** (this is Tier 3-H) |
| **L2 — heuristic + length/script checks** | Walls of base64, suspicious unicode, instruction-shaped input | low | Build alongside L1 |
| **L3 — Rebuff (OSS) / Lakera Guard (SaaS)** | Semantic injection, novel phrasings | dep + latency / paid | Evaluate only if L1+L2 prove insufficient |

#### Honest concerns specific to HV

⚠️ **False positives are uniquely dangerous here.** Legitimate hadith text contains imperatives ("the Prophet ﷺ said: do X"), Arabic, and Cyrillic. A clumsy regex that flags "you must" or non-Latin script will block real claims. The filter must be tuned against your actual five-language corpus, not generic English jailbreak lists.

⚠️ **`temperature: 0` + JSON-only system prompt is already a partial defense.** The output contract is strict and parsed defensively (P032). Injection that tries to make the model "break character" still has to survive `validateOutput()`. Measure how much L3 actually adds before paying for it.

⚠️ **Another dependency = another failure mode.** A SaaS guard (Lakera) adds a network call and an outage surface to a free service. Weigh against the sadaqah/cost constraint.

#### Decision criteria

Adopt L1+L2 now (it's Tier 3-H regardless). Adopt L3 (Rebuff/Lakera) ONLY IF:
1. A red-team set of injection attempts (build ~30, multilingual) gets past L1+L2 *and* past the JSON/validate layer at a rate you consider unacceptable
2. The added latency is acceptable for a free public tool
3. It does not raise the false-positive rate on real five-language claims

#### Roadmap fit

**Phase A (Tier 3-H):** Write `sanitizeInput()`'s regex pre-filter, multilingual-tuned. Add red-team cases to `audit.spec.ts`. ~2h.
**Phase B:** If L1+L2 leak, spike Rebuff (OSS, self-host, no per-call cost) before considering paid Lakera.

---

### Candidate 3: Confidence calibration — making `confidence` mean something

> **Source:** Tier 3-G ("add `{verdict, confidence}` to `/api/analyze`")
> **Status:** ⚠️ NEEDS DESIGN — the honest QA question, not a tool to bolt on

#### The problem you're actually solving

The output already carries `confidence` (it feeds `calculateSeverity`). But where does it come from? If it's Claude self-reporting "0.94," that number is **model-asserted, not calibrated** — the model has no grounded notion of its own error rate. As a QA engineer, shipping an uncalibrated 0.94 as if it were a real probability is the kind of thing CT-AI explicitly warns against.

Tier 3-G is a chance to do it right rather than just surface a vibe.

#### Options, honestly compared

| Approach | How | Cost | Honesty |
|---|---|---|---|
| **Model self-report (current)** | Ask Claude for a number | 1 call | ⚠️ Uncalibrated — label it as such |
| **Self-consistency** | Sample N verdicts (temp > 0), measure agreement → confidence = agreement rate | N× calls | ✅ Grounded, but breaks `temperature: 0` and costs N× |
| **Logprob / token-level** | Use output token probabilities | n/a | ❌ Not exposed for this use; not practical |
| **Calibration set** | Build labeled fabricated/weak/sahih set, measure actual accuracy at each self-reported band, publish a reliability curve | upfront eval cost | ✅ The QA-correct answer — turns "0.94" into "verdicts the model calls 0.9+ are right ~X% of the time" |

#### Honest recommendation

Ship Tier 3-G in two parts:
1. **Now:** expose `confidence` but **label it honestly** in the schema/docs as model-reported, and never let it silently drive an irreversible action (it already only routes severity, which is fine).
2. **Then:** build a small **calibration harness** (pytest, reuse `test_analyze_api.py` infrastructure) over a labeled set so you can state the *actual* hit-rate per confidence band. That reliability curve is both better engineering and a strong CT-GenAI / interview artifact.

Self-consistency is tempting but fights `temperature: 0` and multiplies cost on a free service — reserve it for a research spike, not production.

#### Roadmap fit

**Phase A (Tier 3-G):** add `confidence` to the contract + tests, labeled model-reported. Half-day.
**Phase B:** calibration harness in pytest, produce reliability curve, document. This is where the real value (and the portfolio story) is.

⚠️ **Backward-compat (per Adoption Rule #7):** `confidence` is *already* in the output contract and feeds `calculateSeverity()`. Tier 3-G refines its meaning, not its presence — keep it an additive, non-breaking field so the Telegram bot's parsing doesn't break, and keep `calculateSeverity()` **rule-based and deterministic**. Don't let a "calibrated confidence" effort drift into LLM-graded severity; the deterministic severity logic is itself a contract.

---

### Candidate 4: Anthropic prompt caching for the analyze system prompt

> **Source:** Anthropic API docs (current capability); identical lesson to Idris Candidate 6
> **Status:** ✅ HIGH VALUE quick win

#### Why it fits perfectly

Every `/api/analyze` call ships the same large `SYSTEM_PROMPT` — the source-tier rules, the red-flag taxonomy, the JSON output schema, the tone instructions. That prefix is **identical on every call**. It's a textbook cacheable prefix, and HV's free-forever constraint makes the savings matter more than anywhere else.

#### Quantified benefit

The system prompt is easily several KB of stable tokens billed on every analysis. With caching, the cached prefix is charged at a fraction on subsequent calls within the cache TTL — and a public tool sees bursts of traffic (someone shares the link in a Hajj group, ten people paste posts in two minutes), which is exactly the access pattern caching rewards.

#### Decision criteria

Adopt IF:
1. The model in `route.ts` (`claude-sonnet-4-6`) supports caching — verify in current Anthropic docs
2. The prefix is genuinely stable (it is — only `messages` and the per-post content vary)
3. Refactor is < half a day

#### Implementation sketch

```javascript
// BEFORE
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: imageBase64 ? 3000 : 2048,
  temperature: 0,
  system: SYSTEM_PROMPT,              // full prompt billed every call
  messages: [{ role: 'user', content: messageContent }]
})

// AFTER (cache the stable prefix)
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: imageBase64 ? 3000 : 2048,
  temperature: 0,
  system: [
    {
      type: 'text',
      text: SYSTEM_PROMPT,            // source tiers + schema + tone — cached
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: [{ role: 'user', content: messageContent }]
})
```

#### Roadmap fit

**Quick win, do early.** ~0.5 day. Pairs naturally with Tier 3-G/H since you'll be in `route.ts` anyway. Add a test that the cached path still returns the same verdict shape.

---

### Candidate 5: Model routing (Haiku triage → Sonnet/Opus verdict)

> **Source:** cost-optimization pattern; Anthropic multi-model availability
> **Status:** ⚠️ EVALUATE CAREFULLY — the religious-accuracy stakes cut against over-routing

#### The idea

Not every pasted post is a hadith claim. Some are duas, some are unrelated text, some are spam. A cheap Haiku pre-pass could classify "is this even an authenticatable hadith/dua claim?" and only escalate real claims to the full Sonnet analysis — saving tokens on a free service.

#### Honest concerns specific to HV

⚠️ **Don't let a cheap model gate accuracy.** The danger is a Haiku triage that wrongly drops a real fabricated-hadith claim as "not a claim," so it never gets the serious analysis. For HV, a missed fabrication is a real-world failure (the fabrication keeps spreading). The cheap stage may only *fast-path obvious rejections*, never *suppress* anything ambiguous.

⚠️ **Two stages = two prompts to maintain in five languages.** The triage prompt itself needs UZ/AR/RU/TJ coverage or it'll mis-route non-English claims.

⚠️ **Latency + complexity** on a tool whose whole value is a fast, trustworthy verdict.

#### Decision criteria

Adopt ONLY IF:
1. The triage stage is tuned to **escalate on any doubt** (high recall for "is a claim," even at the cost of escalating some non-claims)
2. Triage accuracy is validated per language
3. Measured token savings actually justify the second prompt's maintenance burden

Honestly: prompt caching (Candidate 4) likely captures most of the cost win with none of this risk. Treat routing as a later optimization, not a near-term move.

---

### Candidate 6: Eval / observability tooling (Promptfoo, RAGAS, Langfuse)

> **Source:** your QA discipline + CT-AI/CT-GenAI track; HV already has `audit.spec.ts` + `@real-api` quality tests
> **Status:** ✅ FIT — but pick ONE, don't tool-sprawl a solo project

#### What each buys HV

- **Promptfoo** — declarative prompt regression. Define a YAML of inputs (known fabricated/sahih/dua claims in all five languages) + assertions (verdict, source tier, deep-link present), run on every prompt change. This is the natural next layer above your hand-written `api.spec.ts` quality tests, and it's the strongest fit today.
- **RAGAS** — retrieval-quality eval (faithfulness, context relevance). Only meaningful **after** Candidate 1 (RAG) lands. Maps directly to CT-GenAI.
- **Langfuse** (or similar) — production tracing/observability: see real verdicts, latencies, and failures over time. Useful once HV has steady public traffic; adds a dependency.

#### Honest concerns

⚠️ **Solo-project tool sprawl.** You already have Playwright + pytest + axe-core + a CAG auto-fix agent + smart pre-push. Adding three eval frameworks is how a one-person project drowns in its own tooling. Pick the one that earns its keep now (Promptfoo), defer the rest to when their precondition exists (RAGAS after RAG; Langfuse after traffic).

#### Decision criteria

Adopt **Promptfoo** now IF the five-language regression set is worth formalizing (it is — you keep re-deriving it in `api.spec.ts`). Adopt **RAGAS** when Candidate 1 ships. Adopt **Langfuse** only if production debugging becomes a real pain.

#### Roadmap fit + interview angle

**Phase A:** Port the existing known-claim cases into a Promptfoo config; wire into CI behind `@real-api` so it runs manually/nightly, not on every doc push. **Interview line:** *"My hadith verifier has a Promptfoo regression suite across five languages — I treat prompt changes like code changes, with a labeled eval set and assertions on source-tier correctness, not just 'looks right.'"*

---

### Candidate 7: Claude native audio input (instead of a Whisper STT chain)

> **Source:** carried forward from the 2026-05-16 draft (audio-input + STT scope); Anthropic API audio capability
> **Status:** 📚 STUDY — forward-looking, no firm timeline, but the clean answer to a problem you already have

#### The use case in HV

HV is text-only today, but real claims arrive as **WhatsApp voice notes** and audio forwards, especially in UZ/RU/TJ community groups. The May draft logged three future audio features: voice-input mode (record a claim instead of pasting), reverse-audio QA (transcribe the read-back comment to verify TTS fidelity), and analysis of audio attachments claiming hadiths.

#### Why native audio beats a Whisper chain — and dodges P078

The obvious build is `audio → Whisper → text → Claude analyze`. But that's a **three-link chain with the P078 failure baked in**: Whisper transliterates UZ/TJ into broken Latin, so the text Claude analyzes is already corrupted, and a wrong transcription produces a wrong verdict.

Claude's native audio input collapses this to `audio → Claude analyze` — **no Whisper, so no transliteration step to fail.** The model reasons over the audio directly, which also lets it weigh *how* a claim is framed (hedging, "I heard that…", certainty). This is the same insight that makes Speechmatics a *worse* fit than it first looks: the cleanest way to handle children's/low-resource-language speech problems is often to remove the brittle STT stage, not swap vendors.

#### Honest concerns specific to HV

⚠️ **Privacy posture changes.** Today HV sends text only. Audio uploads send a user's voice to Anthropic — the privacy disclosure and an explicit opt-in flow must land *before* any audio feature ships.
⚠️ **Cost + variance.** Per-call cost is higher than text, and audio quality variance hits accuracy harder than typos do.
⚠️ **Contract impact.** A new audio path is additive (a new endpoint or mode), so it respects Adoption Rule #7 — but the verdict output shape must stay identical to the text path.

#### Decision criteria

Adopt native audio input IF:
1. A voice-input or audio-attachment feature actually gets scheduled (no firm timeline — likely 2026 Q3–Q4)
2. Privacy disclosure + opt-in ship first
3. The current analyze model supports audio input — verify in Anthropic docs at build time
4. Per-audio cost is acceptable for a free service at typical voice-note lengths

#### Roadmap fit

Forward-looking. When audio scope is scheduled, evaluate **native Claude audio first**, and only fall back to a Speechmatics/Whisper STT stage if native audio underperforms on UZ/TJ — the opposite of the default instinct. Until then, this stays a study item.

---

## Candidates explicitly NOT adopting (and why)

### Fine-tuning a custom hadith-authentication model

Tempting ("a model that just knows the gradings"), but wrong for HV:
- **Authority chain lost** — a fine-tuned model bakes gradings into weights you can't audit or deep-link. RAG (Candidate 1) keeps the real source in the loop, which is the whole point.
- **Multilingual cost** — fine-tuning for UZ/AR/RU/TJ parity is a large, ongoing effort.
- **Claude + RAG dominates** the cost/quality/maintainability tradeoff at this scale.

Don't fine-tune. Ground with retrieval instead.

### Swapping Claude for a local model on verdicts

Trendy for cost, wrong for HV:
- Religious-accuracy stakes demand the strongest available reasoning + the best low-resource-language handling (UZ/TJ), where local models are weakest.
- The free-forever cost concern is better solved by prompt caching (Candidate 4) and routing easy rejections (Candidate 5, carefully) than by degrading verdict quality.

Keep Claude for verdicts. (Local models may have a place in *offline eval batch jobs* — that's a different, low-stakes use.)

### Auto-posting `suggested_comment`

Never. The comment is a **draft for a human to send**, reviewed via the admin queue. Auto-replying to people's posts would:
- Risk publishing an error at scale (a wrong verdict becomes a public wrong correction)
- Violate the compassionate, non-confrontational, human-judgment-in-the-loop design
- Read as bot spam, undermining the dawah intent

This is a permanent constraint, not a deferred feature.

### Vector embeddings for *authority ranking* (distinct from Candidate 1)

The 2026-05-16 draft rejected embeddings for the hadith library, correctly: the tier system (Dorar/Sunnah/HadeethEnc Tier 1 …) is a curated, exact hierarchy, and fuzzy similarity must never decide *which source outranks which*. That rejection stands. Note the distinction from Candidate 1: RAG uses embeddings to retrieve **candidate evidence text**, while the **tier hierarchy stays rule-based** and governs authority. Embeddings for retrieval = yes (Candidate 1, guardrailed); embeddings for authority = no, ever.

---

## Watch list (not evaluated in depth here)

| Tool / Tech | Why interesting | Priority for HV |
|---|---|---|
| **Anthropic prompt caching** | Cut cost on the stable system prompt (Candidate 4) | **HIGH** |
| **Promptfoo** | Five-language prompt regression suite (Candidate 6) | **HIGH** |
| **Supabase pgvector + Voyage AI** | Retrieval corpus for the RAG upgrade (Candidate 1) | **HIGH** |
| **Anthropic contextual retrieval** | Retrieval technique that preserves chunk context — relevant once RAG lands | High |
| **Anthropic batch processing** | Bulk eval runs (calibration set, regression set) cheaply | Medium |
| **Rebuff (OSS)** | Self-hostable injection detection if regex pre-filter leaks (Candidate 2 L3) | Medium |
| **Lakera Guard (SaaS)** | Managed injection guard — only if OSS insufficient and latency acceptable | Low |
| **Langfuse** | Production verdict tracing/observability once traffic is steady | Medium |
| **Citation deep-link validator** | Programmatic HEAD-check that returned source URLs actually resolve | **HIGH** (see upgrades) |
| **Anthropic web search tool** | Let HV verify a source live during analysis | Medium (cost/latency tradeoff) |
| **Sentry** | Production error visibility for the free public service | Medium |
| **Supabase Realtime** | Live-update the admin queue as new flags arrive | Medium |
| **Vercel Edge Functions** | Lower `/api/analyze` latency for global users | Low (already responsive) |
| **Supertonic (local TTS)** | EN/RU/AR read-aloud of generated comments; UZ/TJ must stay on ElevenLabs (no Supertonic support) — informational TTS, low emotional stakes | Low |
| **Speechmatics (STT)** | Fallback STT *only if* native Claude audio (Candidate 7) underperforms on UZ/TJ | Low (prefer Candidate 7) |

---

## HV-specific hard constraints (NEVER violate)

1. **No fabricated citations.** If a source can't be grounded, say so — never invent a URL or grading.
2. **Tier 1 > Tier 2.** Dorar / Sunnah.com / HadeethEnc outrank IslamQA / IslamWeb. Never present a lower tier as authoritative.
3. **Deep-links, not homepages** — link the exact hadith page in every generated comment.
4. **Compassionate tone** — non-confrontational, never shaming the person who shared the post.
5. **Human-in-the-loop** — `suggested_comment` is reviewed in the admin queue; nothing auto-posts.
6. **`temperature: 0`** for verdicts — reproducibility over creativity.
7. **Five-language parity** — EN/UZ/AR/RU/TJ. No tool that serves English at the others' expense.
8. **Non-determinism respected** (P060) — verdict tests tagged `@real-api`, `unclear` is a valid outcome.
9. **Adversarial input assumed** — `sanitizeInput()` / `validateOutput()` stay; injection resistance stays tested.
10. **Free forever (sadaqah jariyah)** — cost-per-verdict is a design constraint, not an afterthought.
11. **`/api/analyze` contract is stable** — the response shape is depended on by the Telegram bot (and any future browser extension). New fields are additive; existing fields never change meaning or vanish.
12. **Severity stays rule-based and deterministic** — `calculateSeverity()` is logic, not an LLM judgment. Never replace it with model-graded severity.
13. **Never auto-delete or auto-ban** — no automated removal of user content or accounts (Meta API ToS + ethical moderation). Humans review; the system flags.

---

## Specific upgrades to consider for HV (NOT from external posts)

Surfaced from looking at the actual repo:

### 1. Reconcile the two `fix_patterns.md` locations

`git ls-files` shows `fix_patterns.md` at root **and** `agents/knowledge/fix_patterns.md`. Before the P079 append (Tier 2-D), decide: are these intentionally separate (root = human-facing log, agents/ = CAG agent's knowledge base), or has one drifted? Document the answer in `CLAUDE.md` so the append targets the right file(s) and future sessions don't guess. **This directly blocks clean execution of Tier 2-D.**

### 2. Citation deep-link validator

After Claude returns `references[]`, programmatically `HEAD`-check that each deep-link actually resolves (200, not 404) before showing it to the user or writing it to `flagged_posts`. This is the cheapest possible defense against the #1 risk (a hallucinated-but-plausible source URL) and pairs with the RAG upgrade as a belt-and-suspenders check. ~Half-day; high value.

### 3. Document the CAG auto-fix agent pattern as reusable QA IP

The Python Playwright auto-fix agent (CAG: loads `CLAUDE.md` + `fix_patterns.md` + `pw_best_practices.md` + git log, opens PRs) is sophisticated prior art. Cross-reference it with Idris's `orchestrator-with-fixer.ts` and HR's Auditor design in `reel-pipeline-design.md` — three projects, one agentic-QA discipline. Strong portfolio + interview narrative.

### 4. Confidence calibration harness (pairs with Tier 3-G)

Stand up a pytest calibration suite over a labeled fabricated/weak/sahih set (reuse `test_analyze_api.py` infrastructure) so `confidence` becomes a measured reliability curve, not a model-asserted number. See Candidate 3.

---

## Action items for post-Hajj

1. **Quick win:** Anthropic prompt caching on the analyze system prompt (Candidate 4). ~0.5 day, immediate cost relief.
2. **Quick win:** Promptfoo regression config from the existing five-language known-claim cases (Candidate 6, Phase A).
3. **Tier 3-H:** regex injection pre-filter in `sanitizeInput()`, multilingual-tuned, + red-team cases in `audit.spec.ts` (Candidate 2, Phase A).
4. **Tier 3-G:** expose `confidence` (labeled model-reported) + stand up the calibration harness (Candidate 3).
5. **Strategic:** scope the RAG upgrade branch — index one collection, build the retrieval-precision eval, A/B against the prompt baseline (Candidate 1). The flagship CT-GenAI work.
6. **Hygiene:** reconcile the two `fix_patterns.md` files before the P079 append (Upgrade 1) and add the citation deep-link validator (Upgrade 2).

---

## Change log

| Date | Change | By |
|---|---|---|
| 2026-05-16 | Initial scouting draft — 4 candidates, mostly forward-looking for unbuilt audio/STT features | Farhod / Claude session |
| 2026-06-09 | Rewritten as sibling to idris-agent-upskilling.md, weighted to HV's verification-service reality; merged the 05-16 draft (recovered stack facts, audio-input candidate, STT roadmap, contract + deterministic-severity constraints; RAG reframed to keep authority ranking rule-based) | Farhod / Claude session |

---

## References

- `CLAUDE.md` — HV project context (source of truth for design philosophy)
- `AGENTS.md` — agent orchestration rulebook
- `QA_STANDARDS_AGENT_RULES.md` — testing standards (aligned with engineering-standards repo)
- `QA_STANDARDS.md` — HV testing standards
- `fix_patterns.md` — HV learnings, P001–P079 (root) and `agents/knowledge/fix_patterns.md`
- `agents/knowledge/pw_best_practices.md` — AI/LLM-specific Playwright patterns
- `README.md`, `FEATURES.md` — public + feature documentation
- `idris-agent-upskilling.md` — Idris project's parallel scouting (cross-reference prompt caching + Voyage AI)
- `hr-agent-upskilling.md` — HR project's parallel scouting (cross-reference Supertonic + Speechmatics)
- `ABOUT.md` — RAG Learning Roadmap (HV is the named flagship)

## Glossary (for future Claude sessions)

- **Verdict:** the authentication outcome — `fabricated` / `weak` / `sahih` / `unclear`
- **Confidence:** model-reported certainty (0–1); see Candidate 3 on making it calibrated
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW, derived by `calculateSeverity()` from verdict + confidence + red flags
- **Red flags:** heuristic markers of likely fabrication (no isnad, "share or sin," guaranteed-reward phrasing, etc.)
- **Tier 1 / Tier 2 sources:** scholarly authority ranking — Dorar/Sunnah.com/HadeethEnc (1) above IslamQA/IslamWeb (2)
- **Deep-link:** a URL to the exact hadith/source page, not a homepage
- **Admin queue:** human-review surface for flagged posts (Supabase `flagged_posts`)
- **CAG:** Cache-Augmented Generation — the auto-fix agent loads its full knowledge base upfront rather than retrieving
- **RAG:** Retrieval-Augmented Generation — Candidate 1's proposed grounding upgrade
- **`@real-api`:** Playwright tag for non-deterministic tests that hit the live Claude API (excluded from the fast pre-push run)
- **P0xx:** fix-pattern IDs in `fix_patterns.md` (HV currently P001–P079)
- **sadaqah jariyah:** ongoing charity — HV is free forever as a community benefit
