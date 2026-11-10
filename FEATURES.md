### Accessibility & Search (planned)
- Hadith search by tag (Salah, Fasting, Charity, Iman etc.)
- "Story behind this hadith" — Claude narrates historical context
- Full keyboard navigation (Tab/Enter/Space for all controls)
- High contrast mode toggle
- Font size adjustment for elderly users
- Screen reader ARIA labels on all interactive elements
- STT on Dua tab already done ✅
- STT on Analyze tab already done ✅

### Admin queue sign-in (P364) ✅
- Admin queue tab asks for the admin password; the queue API refuses anonymous callers (401)
- Log out button ends the session; sessions expire after 12 hours
- Sign-in form and messages in all six app languages (EN, UZ Latin, UZ Cyrillic, RU, AR, TJ)

### Health check that sees a retired model (P388) ✅
- `/api/health` answers 200 only when the database answers AND the Claude model still exists for the key
- 503 with `db` / `claude` states otherwise, for the uptime monitor; no configuration detail exposed

### No generated "Story behind this hadith" (P390) ✅
- The analysis no longer writes a story credited to Ar-Raheeq Al-Makhtum; `seerah_context` is always empty
- Detailed, sourced explanations of a hadith are on hadithreels.com/hadith/<collection>/<number>

