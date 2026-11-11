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

### @HadithVerifierBot inside HV (P396, P398) - branch share-features
- Forward any post to the bot: text, a photo with a caption, or a screenshot; it answers with the site's own analysis
- Reply in the post's language (EN, RU, UZ Cyrillic, UZ Latin, TJ, AR), else the Telegram app's
- Runs as a webhook on hadithverifier.com - no separate server
- "Not a fatwa" line under every answer

### Installable app with the Share menu (P396) - branch share-features
- "Install app" button where the browser offers it; once installed, HV is in Android's Share menu
- A shared post lands in the post box; nothing is analysed until the user presses the button
- HadithAnswers.com listed as a tier 2 source

### Reel link check - planned (REEL_LINK_CHECK.md)
