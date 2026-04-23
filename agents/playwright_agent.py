"""
Playwright Agent — Hadith Verifier Project
==========================================
Reads GitHub Actions failed annotations → loads knowledge base (CAG) →
identifies fix pattern → applies fix → opens PR for human review.

Usage:
  python agents/playwright_agent.py <github_run_id>

Environment variables required:
  ANTHROPIC_API_KEY  — Anthropic API key
  GITHUB_TOKEN       — GitHub token with repo write access
"""

import anthropic
import subprocess
import requests
import os
import json
import sys
from pathlib import Path
from datetime import datetime


# ─── Configuration ────────────────────────────────────────────────────────────

REPO = "Farhod75/hadith-verifier"
MODEL = "claude-sonnet-4-20250514"
GITHUB_API = "https://api.github.com"

# Files the agent is allowed to modify
ALLOWED_FILES = [
    "tests/api.spec.ts",
    "tests/hadith-verifier.spec.ts",
    "tests/severity.spec.ts",
    "app/api/analyze/route.ts",
    "app/api/dua/route.ts",
    "lib/i18n.ts",
]

# Knowledge base files (CAG — loaded upfront, not searched)
KNOWLEDGE_FILES = [
    "CLAUDE.md",
    "agents/knowledge/fix_patterns.md",
    "agents/knowledge/pw_best_practices.md",
]


# ─── GitHub API helpers ────────────────────────────────────────────────────────

def get_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("GITHUB_TOKEN not set")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_failed_annotations(run_id: str) -> list[dict]:
    """Fetch failed annotations from a GitHub Actions run."""
    url = f"{GITHUB_API}/repos/{REPO}/actions/runs/{run_id}/annotations"
    response = requests.get(url, headers=get_headers())
    response.raise_for_status()
    annotations = response.json()
    failed = [a for a in annotations if a.get("annotation_level") == "failure"]
    print(f"[Agent] Found {len(failed)} failed annotations")
    return failed


def get_git_fix_history() -> str:
    """Extract recent fix commits from git log."""
    result = subprocess.run(
        ["git", "log", "--oneline", "-30", "--grep=fix:"],
        capture_output=True, text=True
    )
    return result.stdout or "No recent fix commits found"


def format_annotations(annotations: list[dict]) -> str:
    """Format annotations for the prompt."""
    if not annotations:
        return "No failed annotations found"
    lines = []
    for a in annotations:
        path = a.get("path", "unknown")
        line = a.get("start_line", "?")
        msg = a.get("message", "no message")
        title = a.get("title", "")
        lines.append(f"- {path}:{line} [{title}]\n  {msg}")
    return "\n".join(lines)


# ─── CAG: Knowledge base loader ───────────────────────────────────────────────

def load_knowledge_base() -> str:
    """
    CAG — Load all context upfront into memory.
    Everything is pre-loaded, not searched dynamically.
    """
    sections = []

    # 1. Project rules + known fixes + best practices
    for kb_file in KNOWLEDGE_FILES:
        path = Path(kb_file)
        if path.exists():
            content = path.read_text(encoding="utf-8")
            sections.append(f"## {kb_file}\n{content}")
        else:
            sections.append(f"## {kb_file}\n[File not found — skipping]")

    # 2. Git fix history (dynamic — always current)
    git_history = get_git_fix_history()
    sections.append(f"## Recent fix commits (git log)\n{git_history}")

    # 3. Current test files (what may need fixing)
    test_dir = Path("tests")
    if test_dir.exists():
        for spec_file in sorted(test_dir.glob("*.spec.ts")):
            content = spec_file.read_text(encoding="utf-8")
            sections.append(f"## {spec_file} (current content)\n```ts\n{content}\n```")

    # 4. Source files agent may need to fix
    source_files = [
        "app/api/analyze/route.ts",
        "app/api/dua/route.ts",
    ]
    for src in source_files:
        path = Path(src)
        if path.exists():
            content = path.read_text(encoding="utf-8")
            sections.append(f"## {src} (current content)\n```ts\n{content}\n```")

    return "\n\n".join(sections)


# ─── Agent core ───────────────────────────────────────────────────────────────

def analyze_and_fix(run_id: str):
    """Main agent loop — analyze failures and produce a fix."""

    print(f"[Agent] Starting Playwright Agent for run: {run_id}")

    # Step 1: Get failed annotations
    annotations = get_failed_annotations(run_id)
    if not annotations:
        print("[Agent] No failed annotations found. Nothing to fix.")
        return

    failures_text = format_annotations(annotations)
    print(f"[Agent] Failures:\n{failures_text}")

    # Step 2: Load full knowledge base (CAG)
    print("[Agent] Loading knowledge base (CAG)...")
    knowledge_base = load_knowledge_base()
    print(f"[Agent] Knowledge base loaded — {len(knowledge_base)} chars")

    # Step 3: Call Claude to diagnose and fix
    print("[Agent] Calling Claude to analyze failures...")
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    system_prompt = f"""You are a senior QA engineer and AI testing specialist
working on the Hadith Verifier project — an Islamic hadith authentication app
built with Next.js, TypeScript, Playwright, and the Anthropic Claude API.

You have deep knowledge of this specific project including all past fixes,
known flaky test patterns, and best practices.

YOUR KNOWLEDGE BASE (pre-loaded via CAG):
{knowledge_base}

YOUR RULES:
1. Always check fix_patterns.md FIRST — if this matches a known pattern, apply
   the documented fix immediately without re-diagnosing.
2. If it's a new pattern, diagnose carefully using pw_best_practices.md.
3. Fix the ROOT CAUSE — never just increase timeouts as the only fix.
4. Only modify files in this allowed list: {ALLOWED_FILES}
5. Always provide the COMPLETE file content in your fix, not just a diff.
6. The fix must not break any currently passing tests.
7. Follow the project's existing code style exactly.
8. Human review is REQUIRED before merging — your PR is a suggestion, not auto-merge.
"""

    user_message = f"""These Playwright tests failed in the latest CI run (GitHub Actions run: {run_id}):

{failures_text}

Please:
1. Identify which known pattern from fix_patterns.md this matches (if any)
2. Explain the root cause
3. Provide the complete fix

Respond ONLY with this JSON (no markdown, no backticks):
{{
  "pattern_matched": "P002: UI timeout waiting for source reference links",
  "is_known_pattern": true,
  "root_cause": "Default 60s timeout insufficient for AI response + UI render in CI",
  "fix_type": "test",
  "file_to_fix": "tests/hadith-verifier.spec.ts",
  "fix_explanation": "Increase timeout to 90s and use waitForResponse pattern",
  "fixed_content": "// COMPLETE FILE CONTENT HERE",
  "also_fix_source": false,
  "source_file": null,
  "source_fix_explanation": null,
  "source_fixed_content": null,
  "confidence": "high",
  "pr_title": "[Agent Fix] Increase timeout on flaky source reference tests",
  "pr_body": "Detailed explanation for PR description"
}}
"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    raw = response.content[0].text
    print(f"[Agent] Claude response received ({len(raw)} chars)")

    # Step 4: Parse fix
    try:
        fix = json.loads(raw.replace("```json", "").replace("```", "").strip())
    except json.JSONDecodeError as e:
        print(f"[Agent] ERROR: Could not parse Claude response as JSON: {e}")
        print(f"[Agent] Raw response:\n{raw[:500]}")
        return

    print(f"[Agent] Pattern matched: {fix['pattern_matched']}")
    print(f"[Agent] Root cause: {fix['root_cause']}")
    print(f"[Agent] Confidence: {fix['confidence']}")

    # Step 5: Validate file is in allowed list
    file_to_fix = fix["file_to_fix"]
    if file_to_fix not in ALLOWED_FILES:
        print(f"[Agent] ERROR: {file_to_fix} is not in allowed files list. Aborting.")
        return

    # Step 6: Apply the fix
    print(f"[Agent] Applying fix to: {file_to_fix}")
    apply_fix(fix)


def apply_fix(fix: dict):
    """Write fix to file, create branch, commit, push, open PR."""

    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    pattern_slug = fix["pattern_matched"][:20].lower()
    pattern_slug = "".join(c if c.isalnum() else "-" for c in pattern_slug).strip("-")
    branch = f"agent/fix-{pattern_slug}-{timestamp}"

    # Write primary fix file
    file_path = Path(fix["file_to_fix"])
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(fix["fixed_content"], encoding="utf-8")
    print(f"[Agent] Written: {file_path}")

    # Write secondary fix file if needed (e.g., route.ts alongside spec fix)
    files_changed = [fix["file_to_fix"]]
    if fix.get("also_fix_source") and fix.get("source_file") and fix.get("source_fixed_content"):
        source_path = Path(fix["source_file"])
        if fix["source_file"] in ALLOWED_FILES:
            source_path.write_text(fix["source_fixed_content"], encoding="utf-8")
            files_changed.append(fix["source_file"])
            print(f"[Agent] Also written: {source_path}")

    # Git operations
    subprocess.run(["git", "config", "user.email", "playwright-agent@hadithverifier.com"])
    subprocess.run(["git", "config", "user.name", "Playwright Agent"])
    subprocess.run(["git", "checkout", "-b", branch], check=True)

    for f in files_changed:
        subprocess.run(["git", "add", f], check=True)

    commit_msg = (
        f"fix(agent): {fix['fix_explanation']}\n\n"
        f"Pattern: {fix['pattern_matched']}\n"
        f"Root cause: {fix['root_cause']}\n"
        f"Confidence: {fix['confidence']}\n"
        f"Files changed: {', '.join(files_changed)}"
    )
    subprocess.run(["git", "commit", "-m", commit_msg], check=True)
    subprocess.run(["git", "push", "origin", branch], check=True)
    print(f"[Agent] Pushed branch: {branch}")

    # Open PR
    create_pull_request(branch, fix, files_changed)


def create_pull_request(branch: str, fix: dict, files_changed: list[str]):
    """Open a PR on GitHub for human review."""

    url = f"{GITHUB_API}/repos/{REPO}/pulls"

    pr_body = f"""## 🤖 Automated Fix by Playwright Agent

> ⚠️ **Human review required before merging.**

---

### Pattern Matched
`{fix['pattern_matched']}`
Known pattern: {'✅ Yes — applied documented fix' if fix['is_known_pattern'] else '🆕 New pattern — new diagnosis'}

### Root Cause
{fix['root_cause']}

### Fix Applied
{fix['fix_explanation']}

### Files Changed
{chr(10).join(f'- `{f}`' for f in files_changed)}

### Confidence
{fix['confidence'].upper()}

---

### Review Checklist
- [ ] Fix addresses root cause (not just symptoms)
- [ ] No currently-passing tests will break
- [ ] Code style matches existing codebase
- [ ] If new pattern, add it to `agents/knowledge/fix_patterns.md`

---
{fix.get('pr_body', '')}

---
*Generated by PlaywrightAgent using CAG (Cache-Augmented Generation)*
*Knowledge base: fix_patterns.md + pw_best_practices.md + CLAUDE.md*
"""

    data = {
        "title": fix["pr_title"],
        "body": pr_body,
        "head": branch,
        "base": "main",
        "draft": False,
    }

    response = requests.post(url, headers=get_headers(), json=data)

    if response.status_code == 201:
        pr_url = response.json().get("html_url")
        print(f"[Agent] ✅ PR created: {pr_url}")
    else:
        print(f"[Agent] ERROR creating PR: {response.status_code}")
        print(response.json())


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agents/playwright_agent.py <github_run_id>")
        print("Example: python agents/playwright_agent.py 15234567890")
        sys.exit(1)

    required_env = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"]
    missing = [e for e in required_env if not os.environ.get(e)]
    if missing:
        print(f"ERROR: Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    run_id = sys.argv[1]
    analyze_and_fix(run_id)
