"""
Playwright Agent -- Hadith Verifier Project
==========================================
Reads GitHub Actions failed annotations -> loads knowledge base (CAG) ->
identifies fix pattern -> applies fix -> opens PR for human review.

Usage:
  python agents/playwright_agent.py <github_run_id>

Environment variables required:
  ANTHROPIC_API_KEY  -- Anthropic API key
  GITHUB_TOKEN       -- GitHub token with repo write access
"""

import anthropic
import subprocess
import requests
import os
import json
import sys
from pathlib import Path
from datetime import datetime


# --- Configuration ------------------------------------------------------------

REPO = "Farhod75/hadith-verifier"
MODEL = "claude-sonnet-4-20250514"
GITHUB_API = "https://api.github.com"

ALLOWED_FILES = [
    "tests/api.spec.ts",
    "tests/hadith-verifier.spec.ts",
    "tests/severity.spec.ts",
    "app/api/analyze/route.ts",
    "app/api/dua/route.ts",
    "lib/i18n.ts",
]

KNOWLEDGE_FILES = [
    "CLAUDE.md",
    "agents/knowledge/fix_patterns.md",
    "agents/knowledge/pw_best_practices.md",
]


# --- GitHub API helpers -------------------------------------------------------

def get_headers():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("GITHUB_TOKEN not set")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_failed_annotations(run_id: str) -> list:
    """Fetch failed annotations from a GitHub Actions run via jobs."""
    jobs_url = f"{GITHUB_API}/repos/{REPO}/actions/runs/{run_id}/jobs"
    jobs_response = requests.get(jobs_url, headers=get_headers())
    jobs_response.raise_for_status()
    jobs = jobs_response.json().get("jobs", [])
    print(f"[Agent] Found {len(jobs)} jobs in run {run_id}")

    annotations = []
    for job in jobs:
        job_id = job["id"]
        ann_url = f"{GITHUB_API}/repos/{REPO}/check-runs/{job_id}/annotations"
        ann_response = requests.get(ann_url, headers=get_headers())
        if ann_response.status_code == 200:
            failed = [
                a for a in ann_response.json()
                if a.get("annotation_level") == "failure"
            ]
            annotations.extend(failed)

    print(f"[Agent] Found {len(annotations)} failed annotations")
    return annotations


def get_git_fix_history() -> str:
    result = subprocess.run(
        ["git", "log", "--oneline", "-30", "--grep=fix:"],
        capture_output=True, text=True
    )
    return result.stdout or "No recent fix commits found"


def format_annotations(annotations: list) -> str:
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


# --- CAG: Knowledge base loader -----------------------------------------------

def load_knowledge_base() -> str:
    sections = []

    for kb_file in KNOWLEDGE_FILES:
        path = Path(kb_file)
        if path.exists():
            content = path.read_text(encoding="utf-8")
            sections.append(f"## {kb_file}\n{content}")
        else:
            sections.append(f"## {kb_file}\n[File not found -- skipping]")

    git_history = get_git_fix_history()
    sections.append(f"## Recent fix commits (git log)\n{git_history}")

    test_dir = Path("tests")
    if test_dir.exists():
        for spec_file in sorted(test_dir.glob("*.spec.ts")):
            content = spec_file.read_text(encoding="utf-8")
            sections.append(f"## {spec_file} (current content)\n```ts\n{content}\n```")

    for src in ["app/api/analyze/route.ts", "app/api/dua/route.ts"]:
        path = Path(src)
        if path.exists():
            content = path.read_text(encoding="utf-8")
            sections.append(f"## {src} (current content)\n```ts\n{content}\n```")

    return "\n\n".join(sections)


# --- Agent core ---------------------------------------------------------------

def analyze_and_fix(run_id: str):
    print(f"[Agent] Starting Playwright Agent for run: {run_id}")

    annotations = get_failed_annotations(run_id)
    if not annotations:
        print("[Agent] No failed annotations found. Nothing to fix.")
        return

    failures_text = format_annotations(annotations)
    print(f"[Agent] Failures:\n{failures_text}")

    print("[Agent] Loading knowledge base (CAG)...")
    knowledge_base = load_knowledge_base()
    print(f"[Agent] Knowledge base loaded -- {len(knowledge_base)} chars")

    print("[Agent] Calling Claude to analyze failures...")
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    system_prompt = f"""You are a senior QA engineer and AI testing specialist
working on the Hadith Verifier project -- an Islamic hadith authentication app
built with Next.js, TypeScript, Playwright, and the Anthropic Claude API.

YOUR KNOWLEDGE BASE (pre-loaded via CAG):
{knowledge_base}

YOUR RULES:
1. Check fix_patterns.md FIRST -- if pattern matches, apply documented fix immediately.
2. If new pattern, diagnose using pw_best_practices.md.
3. Fix ROOT CAUSE -- never just increase timeouts as the only fix.
4. Only modify files in: {ALLOWED_FILES}
5. Always provide COMPLETE file content, not a diff.
6. Fix must not break passing tests.
7. Follow existing code style exactly.
8. Human review REQUIRED before merging.
"""

    user_message = f"""These Playwright tests failed in CI run: {run_id}

{failures_text}

Respond ONLY with this JSON (no markdown, no backticks):
{{
  "pattern_matched": "P001: description",
  "is_known_pattern": true,
  "root_cause": "explanation",
  "fix_type": "test",
  "file_to_fix": "tests/api.spec.ts",
  "fix_explanation": "what was changed and why",
  "fixed_content": "COMPLETE FILE CONTENT HERE",
  "also_fix_source": false,
  "source_file": null,
  "source_fix_explanation": null,
  "source_fixed_content": null,
  "confidence": "high",
  "pr_title": "[Agent Fix] description",
  "pr_body": "detailed PR description"
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

    try:
        fix = json.loads(raw.replace("```json", "").replace("```", "").strip())
    except json.JSONDecodeError as e:
        print(f"[Agent] ERROR: Could not parse response as JSON: {e}")
        print(f"[Agent] Raw response:\n{raw[:500]}")
        return

    print(f"[Agent] Pattern matched: {fix['pattern_matched']}")
    print(f"[Agent] Root cause: {fix['root_cause']}")
    print(f"[Agent] Confidence: {fix['confidence']}")

    file_to_fix = fix["file_to_fix"]
    if file_to_fix not in ALLOWED_FILES:
        print(f"[Agent] ERROR: {file_to_fix} not in allowed files. Aborting.")
        return

    print(f"[Agent] Applying fix to: {file_to_fix}")
    apply_fix(fix)


def apply_fix(fix: dict):
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    pattern_slug = fix["pattern_matched"][:20].lower()
    pattern_slug = "".join(c if c.isalnum() else "-" for c in pattern_slug).strip("-")
    branch = f"agent/fix-{pattern_slug}-{timestamp}"

    file_path = Path(fix["file_to_fix"])
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(fix["fixed_content"], encoding="utf-8")
    print(f"[Agent] Written: {file_path}")

    files_changed = [fix["file_to_fix"]]
    if fix.get("also_fix_source") and fix.get("source_file") and fix.get("source_fixed_content"):
        if fix["source_file"] in ALLOWED_FILES:
            Path(fix["source_file"]).write_text(fix["source_fixed_content"], encoding="utf-8")
            files_changed.append(fix["source_file"])
            print(f"[Agent] Also written: {fix['source_file']}")

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

    create_pull_request(branch, fix, files_changed)


def create_pull_request(branch: str, fix: dict, files_changed: list):
    url = f"{GITHUB_API}/repos/{REPO}/pulls"

    pr_body = f"""## Automated Fix by Playwright Agent

> WARNING: Human review required before merging.

### Pattern Matched
{fix['pattern_matched']}
Known pattern: {'Yes -- applied documented fix' if fix['is_known_pattern'] else 'New pattern -- new diagnosis'}

### Root Cause
{fix['root_cause']}

### Fix Applied
{fix['fix_explanation']}

### Files Changed
{chr(10).join(f'- {f}' for f in files_changed)}

### Confidence
{fix['confidence'].upper()}

### Review Checklist
- [ ] Fix addresses root cause (not just symptoms)
- [ ] No currently-passing tests will break
- [ ] Code style matches existing codebase
- [ ] If new pattern, add it to agents/knowledge/fix_patterns.md

{fix.get('pr_body', '')}

Generated by PlaywrightAgent using CAG (Cache-Augmented Generation)
Knowledge base: fix_patterns.md + pw_best_practices.md + CLAUDE.md
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
        print(f"[Agent] PR created: {pr_url}")
    else:
        print(f"[Agent] ERROR creating PR: {response.status_code}")
        print(response.json())


# --- Entry point --------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agents/playwright_agent.py <github_run_id>")
        sys.exit(1)

    required_env = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN"]
    missing = [e for e in required_env if not os.environ.get(e)]
    if missing:
        print(f"ERROR: Missing env vars: {', '.join(missing)}")
        sys.exit(1)

    run_id = sys.argv[1]
    analyze_and_fix(run_id)