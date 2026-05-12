# AGENTS.md
# Hadith Verifier — Agent Orchestration Rulebook
# github.com/Farhod75/hadith-verifier
# Version: 1.0 — May 2026
#
# Claude Code reads this file before every task.
# All rules here are enforced automatically.
# Universal rules live in QA_STANDARDS_AGENT_RULES.md (also in this repo).
# ============================================================

## ════════════════════════════════════════════════════════
## ORCHESTRATOR INSTRUCTIONS
## ════════════════════════════════════════════════════════

When Farhod gives you a task, follow this sequence EVERY TIME:

### Step 1 — Classify the task
- Feature → Code agent + Test agent + Doc agent + Git agent
- Bug fix → CI monitor + Code agent + Doc agent (fix_patterns) + Git agent
- CI failure → CI monitor agent ONLY first → then fix → then doc + git
- Documentation → Doc agent only
- Question → Answer directly, no files needed

### Step 2 — Check before building
1. Read fix_patterns.md — is there a matching pattern? Apply it immediately.
2. Read CLAUDE.md — what is the current state of the file being modified?
3. Read QA_STANDARDS_AGENT_RULES.md — which rules apply to this task?
4. If touching a route file: check ALL content-type paths it handles (P041)

### Step 3 — Execute with correct agent
See agent assignments below.

### Step 4 — Verify completion checklist
Before declaring a task done, confirm:
- [ ] Code works (no TypeScript errors, no import issues)
- [ ] Test written or updated (mocked for CI, @real-api tagged for manual)
- [ ] fix_patterns.md entry written (if this was a fix)
- [ ] CLAUDE.md updated (if feature/fix changes app state)
- [ ] audit_spec.ts updated (if new API field added)
- [ ] Git commands provided (specific files, not git add .)
- [ ] CI expected to pass (no real API calls in push tests)

### Step 5 — Report format
Always end with:
```
## ✅ Task complete
Files changed: {list}
Commit: {exact command}
CI risk: {low/medium/high} — {reason}
Next step: {what Farhod should do}
```

## ════════════════════════════════════════════════════════
## AGENT ASSIGNMENTS
## ════════════════════════════════════════════════════════

### 🔧 Code agent
Triggered by: new feature, bug fix, route change, UI change
Rules:
- Read current file FIRST (view or Get-Content)
- Minimum scope — touch fewest lines possible
- Check content-type paths before rewriting any route (P041)
- NEVER change files not related to the task
- Output: complete ready-to-paste file OR exact diff
- Reference: QA_STANDARDS_AGENT_RULES.md Section 2

### 🧪 Test agent
Triggered by: any code change, new API field, new UI component
Rules:
- ALL CI push tests must mock /api/analyze (P043)
- @real-api tag for any test calling real Claude/ElevenLabs
- Scope all locators to specific containers, never .last() (P038)
- Add sentinel debug returns in page.evaluate() blocks
- Write fix_patterns entry when fixing a test
- When new field added to AI response → add to audit_spec.ts same day
- Reference: QA_STANDARDS_AGENT_RULES.md Section 3

### 📝 Doc agent
Triggered by: every code change (runs alongside code/test agents)
Rules:
- fix_patterns.md entry in SAME commit as the fix (never separate)
- CLAUDE.md update: test counts, CI status, pending features
- CHANGELOG.md entry under [Unreleased]
- If new API field: update AnalysisResult interface doc in CLAUDE.md
- Reference: QA_STANDARDS_AGENT_RULES.md Section 4

### 🚀 Git agent
Triggered by: when task is ready to push
Rules:
- Provide exact PowerShell commands with specific file names
- Never suggest git add .
- One commit per concern
- Conventional commit format: type: description (pattern-id)
- Never mix HV + HR in same commit
- Reference: QA_STANDARDS_AGENT_RULES.md Section 5

### 👁 CI monitor agent
Triggered by: CI failure screenshot or description
Rules:
- Read exact error line + spec file + line number from screenshot
- Check fix_patterns.md FIRST before diagnosing
- If same test failed 3+ times → stop patching, redesign test
- Prescribe complete fix in one step, not incremental patches
- Log to fix_patterns.md immediately after fix
- Reference: QA_STANDARDS_AGENT_RULES.md Section 6

## ════════════════════════════════════════════════════════
## HV-SPECIFIC AGENT RULES
## ════════════════════════════════════════════════════════

### API shape (current — May 2026)
POST /api/analyze returns:
```json
{
  "verdict": "fabricated|weak|authentic|unclear|no_hadith",
  "confidence": "high|medium|low",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "claim_summary": "string",
  "analysis": "string",
  "authentic_alternative": "string",
  "red_flags": ["string"],
  "references": [{"source":"","description":"","url":"","authority":"tier1|2|3"}],
  "suggested_comment": "string",
  "seerah_context": "string"
}
```
When this shape changes → update: AnalysisResult interface in page.tsx +
CLAUDE.md API section + audit_spec.ts Section 1.

### Test mock shape
MOCK_RESPONSE(lang) must match the API shape above exactly.
When API shape changes → update MOCK_RESPONSE same day.

### File ownership
| File | Owner agent | Never touched by |
|---|---|---|
| app/api/analyze/route.ts | Code | — |
| app/page.tsx | Code | — |
| tests/hadith-verifier.spec.ts | Test | Code |
| tests/audit_spec.ts | Test | Code |
| tests/fixtures/test-data.ts | Test | — |
| fix_patterns.md | Doc | Code, Test |
| CLAUDE.md | Doc | Code, Test |
| AGENTS.md | Orchestrator | all agents |
| QA_STANDARDS_AGENT_RULES.md | Orchestrator | all agents |

### Known never-do list (from this project's history)
- P001: Never use anon key server-side in Supabase routes
- P037: Never use page.locator('a[href^="https://"]').first() on full page
- P038: Never use .last() on .bg-gray-50.rounded-lg — scope to container
- P039: Never use replyLang for search queries — use appLang
- P040: Never set timeout <110000 for tests calling real Claude with seerah_context
- P041: Never rewrite a route without checking ALL content-type paths
- P042: Never add appLang without syncing replyLang via useEffect
- P043: Never call real Claude/ElevenLabs in CI push tests

### Port assignments (Windows local dev)
- Port 3000: reserved (other app)
- Port 3001: hadith-verifier (`npm run dev -- -p 3001`)
- Port 3002: hadith-reels (`npm run dev -- -p 3002`)

## ════════════════════════════════════════════════════════
## UPSKILL SCHEDULE
## ════════════════════════════════════════════════════════

### On every CI push
- Read fix_patterns.md before task (auto-upgrade)
- Log new pattern if fix applied

### Weekly (Friday)
- Check: https://github.com/microsoft/playwright/releases
- Check: https://www.anthropic.com/news
- Check: https://github.com/Farhod75/engineering-standards (own standards repo)

### Monthly
- Review: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Review: https://www.istqb.org/certifications/certified-tester-ai-testing
- Update QA_STANDARDS_AGENT_RULES.md version number

## ════════════════════════════════════════════════════════
## CROSS-PROJECT PROPAGATION
## ════════════════════════════════════════════════════════

When a new rule is added to this file OR QA_STANDARDS_AGENT_RULES.md:
```powershell
# Copy universal standards to all projects
Copy-Item "QA_STANDARDS_AGENT_RULES.md" `
  "C:\QA\Hadith verification AI app\hadith-reels\QA_STANDARDS_AGENT_RULES.md" -Force

Copy-Item "QA_STANDARDS_AGENT_RULES.md" `
  "C:\QA\idris-learning-app\QA_STANDARDS_AGENT_RULES.md" -Force

# Commit in each project:
# docs: sync QA_STANDARDS_AGENT_RULES.md from hadith-verifier
```

---
*Last updated: May 2026*
*Read QA_STANDARDS_AGENT_RULES.md for full universal standards*
## ════════════════════════════════════════════════════════
## ADDENDUM TO AGENTS.md (both HV and HR)
## Append to the bottom of each AGENTS.md
## ════════════════════════════════════════════════════════

## ── GOLDEN RULE: CI GREEN GATE ──────────────────────────
## Added: May 2026 — agreed with Farhod
## ─────────────────────────────────────────────────────────

### The rule
**NEVER move to the next task until CI is green.**

This applies to:
- Every feature build
- Every bug fix
- Every doc update
- Every spec change
- Moving from HV tasks to HR tasks (or vice versa)
- Starting any new Phase

### Why
- Red CI = broken code in main branch = next push builds on broken foundation
- Moving forward with red CI caused 10+ wasted CI runs (P037–P048)
- Each wasted run = 3-5 minutes + context switching + debugging time

### How to enforce
Before declaring any task complete, the orchestrator MUST:
1. Confirm CI run number from GitHub Actions
2. Confirm green ✅ status
3. Only then mark task done and move to next

### Exception
Documentation-only commits (CLAUDE.md, fix_patterns.md, README.md):
- These cannot break CI
- Can be pushed while watching another CI run
- But still must not contain code changes

### What to do if CI is red
1. STOP — do not start next task
2. CI monitor agent reads the failure
3. Check fix_patterns.md first
4. Fix the failing test
5. Push fix
6. Wait for green
7. THEN move forward

## ── NEVER-DO LIST ADDITIONS (P046–P048) ─────────────────

- P046: Never add language-speech or ElevenLabs steps to CI push workflow
- P047: Never use getByText() or filter({ hasText }) on buttons with emojis
- P048: Never test UI label text — test functional outcome instead
- P048: For emoji tab buttons use page.evaluate() to click by textContent
- P048: For lang buttons scope to header: page.locator('header').locator('button', { hasText: 'EN' })

## ── TEST DESIGN CHECKLIST (before writing any new test) ──

Ask these questions before writing each test:
1. Am I testing a label/text or a functional outcome? → Test outcome
2. Does the element I'm targeting contain an emoji? → Use evaluate()
3. Am I calling a real external API? → Mock it or tag @real-api
4. Is this locator scoped to a specific container? → If not, scope it
5. Would this test pass if the feature was broken? → If yes, rewrite it
