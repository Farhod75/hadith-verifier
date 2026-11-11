// lib/share.ts
// P396: what Android's Share menu sends to the installed app (app/manifest.ts
// share_target: GET /?title=&text=&url=), as one post text. Apps fill these
// differently - Telegram puts the whole message in text, Chrome puts the page
// title in title and the link in url, some repeat the link inside text - so
// each part is kept once.

export const SHARED_MAX = 5000

export function sharedText(title: string | null, text: string | null, url: string | null): string {
  const parts: string[] = []
  for (const raw of [title, text, url]) {
    const s = (raw || '').trim()
    if (!s || parts.some(p => p.includes(s))) continue
    // a later part that contains an earlier one replaces it (a title repeated inside the text)
    for (let i = parts.length - 1; i >= 0; i--) if (s.includes(parts[i])) parts.splice(i, 1)
    parts.push(s)
  }
  return parts.join('\n').slice(0, SHARED_MAX)
}
