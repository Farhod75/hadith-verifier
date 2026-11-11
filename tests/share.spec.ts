// tests/share.spec.ts
// P396: HV as an installable app that appears in Android's Share menu, the shared
// post landing in the post box, and the "not a fatwa" line under every result.
// /api/analyze is mocked with page.route (P043) - no model call.
import { test, expect } from '@playwright/test'
import { sharedText } from '../lib/share'

const RESULT = {
  verdict: 'fabricated', confidence: 'high', severity: 'CRITICAL',
  claim_summary: 'Reading Fatiha 4 times = 4000 days of charity',
  analysis: 'No isnad and no collection records it.',
  authentic_alternative: 'Al-Fatiha is the greatest surah.',
  red_flags: ['Reward inflation'],
  references: [{ source: 'Sahih al-Bukhari', description: 'the greatest surah', url: 'https://sunnah.com/bukhari:4474', authority: 'tier1' }],
  suggested_comment: 'Assalamu alaykum - please check before sharing.',
  seerah_context: '',
}

test.describe('PWA and the Share menu (P396)', () => {
  test('the manifest is served and declares the share target', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest')
    expect(r.status()).toBe(200)
    const m = await r.json()
    expect(m.display).toBe('standalone')
    expect(m.share_target).toEqual({ action: '/', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } })
    for (const icon of m.icons) {
      const i = await request.get(icon.src)
      expect(i.status(), icon.src).toBe(200)
      expect(i.headers()['content-type']).toContain('image/png')
    }
    expect(m.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true)
  })

  test('the page links the manifest', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  })

  test('a shared post lands in the post box and leaves the address bar', async ({ page }) => {
    const text = 'Расул (с.а.в) айтдилар: Ким ухлашдан олдин 4 марта Сура Фотиҳа ўқиса, 4000 кун садақа савоби ёзилади.'
    await page.goto('/?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://t.me/x/1'))
    await expect(page.locator('textarea').first()).toHaveValue(text + '\nhttps://t.me/x/1')
    await expect(page).toHaveURL(/\/$/)
  })

  test('the result ends with the not-a-fatwa line, in the interface language', async ({ page }) => {
    await page.route('**/api/analyze', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESULT) }))
    await page.goto('/')
    await page.locator('textarea').first().fill('The Prophet said whoever reads Fatiha 4 times gets 4000 days of charity')
    await page.locator('button.bg-emerald-700').first().click()
    await expect(page.getByTestId('not-fatwa')).toHaveText(/not a fatwa/i)
  })

  test('an error answer does not leave the spinner running', async ({ page }) => {
    await page.route('**/api/analyze', route => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Daily limit reached. Please try again tomorrow.' }) }))
    page.on('dialog', d => d.dismiss())
    await page.goto('/')
    await page.locator('textarea').first().fill('The Prophet said whoever reads Fatiha 4 times gets 4000 days of charity')
    const button = page.locator('button.bg-emerald-700').first()
    await button.click()
    await expect(button).toBeEnabled({ timeout: 5000 })
  })

  test('HadithAnswers is listed as a tier 2 source', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sources/i }).first().click()
    await expect(page.getByText('HadithAnswers.com', { exact: true })).toBeVisible()
  })
})

test('sharedText keeps each part once', () => {
  expect(sharedText('Post', 'Post text https://t.me/x/1', 'https://t.me/x/1')).toBe('Post text https://t.me/x/1')
  expect(sharedText(null, 'only text', null)).toBe('only text')
  expect(sharedText('Title', null, 'https://a.b/c')).toBe('Title\nhttps://a.b/c')
  expect(sharedText('', '', '')).toBe('')
})
