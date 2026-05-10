# ============================================================
# Hadith Verifier — One-Shot Setup Script
# Run from project root: .\setup_agent.ps1
# ============================================================

Write-Host "Setting up Playwright Agent + Audit layer..." -ForegroundColor Green

# ─── Step 1: Create directories ──────────────────────────────
New-Item -ItemType Directory -Force -Path "agents\knowledge" | Out-Null
Write-Host "Directories created" -ForegroundColor Cyan

# ─── Step 2: Copy downloaded files ──────────────────────────
$downloads = "$env:USERPROFILE\Downloads"

# Agent knowledge base
Copy-Item "$downloads\fix_patterns.md"       "agents\knowledge\fix_patterns.md"       -Force
Copy-Item "$downloads\pw_best_practices.md"  "agents\knowledge\pw_best_practices.md"  -Force

# Agent script
Copy-Item "$downloads\playwright_agent.py"   "agents\playwright_agent.py"             -Force

# GitHub Actions workflow
Copy-Item "$downloads\auto-fix.yml"          ".github\workflows\auto-fix.yml"         -Force

# Audit test
Copy-Item "$downloads\audit.spec.ts"         "tests\audit.spec.ts"                    -Force

Write-Host "Files copied" -ForegroundColor Cyan

# ─── Step 3: Update model in playwright_agent.py ────────────
(Get-Content "agents\playwright_agent.py") `
  -replace 'claude-sonnet-4-20250514', 'claude-sonnet-4-6' |
  Set-Content "agents\playwright_agent.py"
Write-Host "Model updated to claude-sonnet-4-6 in agent" -ForegroundColor Cyan

# ─── Step 4: Update model in route.ts ───────────────────────
(Get-Content "app\api\analyze\route.ts") `
  -replace 'claude-sonnet-4-20250514', 'claude-sonnet-4-6' |
  Set-Content "app\api\analyze\route.ts"
Write-Host "Model updated to claude-sonnet-4-6 in route.ts" -ForegroundColor Cyan

# ─── Step 5: Git add + commit + push ────────────────────────
git add agents\ .github\workflows\auto-fix.yml tests\audit.spec.ts app\api\analyze\route.ts
git commit -m "feat: add audit tests, security layer, CAG knowledge base (P024-P028) + upgrade to claude-sonnet-4-6"
git push origin main

Write-Host ""
Write-Host "Done! All files pushed to GitHub." -ForegroundColor Green
Write-Host "Next: manually add sanitizeInput() and validateOutput() from security_layer.ts into app\api\analyze\route.ts" -ForegroundColor Yellow
