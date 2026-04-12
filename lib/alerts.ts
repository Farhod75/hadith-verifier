// ============================================================
// HADITH VERIFIER — Alert System
// Sends notifications to Slack and Telegram when
// fabricated or weak hadiths are detected
// ============================================================

interface AlertPayload {
  verdict: string
  confidence: string
  claim_summary: string
  red_flags: string[]
  analysis: string
  authentic_alternative: string
  suggested_comment: string
  references: Array<{
    source: string
    url: string
    authority: string
  }>
  lang: string
  post_text: string
}

// ─────────────────────────────────────────
// SLACK ALERT
// ─────────────────────────────────────────
export async function sendSlackAlert(payload: AlertPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  console.log('sendSlackAlert called, URL exists:', !!webhookUrl)
  if (!webhookUrl) return

  const verdictEmoji = payload.verdict === 'fabricated' ? '🚨' : '⚠️'
  const confidenceEmoji = payload.confidence === 'high' ? '🔴' : payload.confidence === 'medium' ? '🟡' : '🟢'

  const topSource = payload.references?.[0]
  const sourceText = topSource?.url
    ? `<${topSource.url}|${topSource.source}>`
    : topSource?.source || 'No source provided'

  const redFlagsText = payload.red_flags?.slice(0, 3)
    .map(f => `• ${f}`)
    .join('\n') || 'None detected'

  const slackBody = {
    text: `${verdictEmoji} *Fabricated hadith detected on social media*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${verdictEmoji} ${payload.verdict.toUpperCase()} HADITH DETECTED`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Verdict:*\n${verdictEmoji} ${payload.verdict}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:*\n${confidenceEmoji} ${payload.confidence}`
          },
          {
            type: 'mrkdwn',
            text: `*Reply language:*\n${payload.lang.toUpperCase()}`
          },
          {
            type: 'mrkdwn',
            text: `*Top source:*\n${sourceText}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Claim:*\n${payload.claim_summary}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Red flags:*\n${redFlagsText}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Analysis:*\n${payload.analysis}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ready-to-post comment (${payload.lang.toUpperCase()}):*\n\`\`\`${payload.suggested_comment}\`\`\``
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Original post text:*\n${payload.post_text.slice(0, 300)}${payload.post_text.length > 300 ? '...' : ''}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ *Admin action required* — AI flags, humans decide. Review before taking action.'
          }
        ]
      }
    ]
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackBody)
    })
    if (!res.ok) {
      console.error('Slack alert failed:', res.status, await res.text())
    } else {
      console.log('Slack alert sent successfully')
    }
  } catch (e) {
    console.error('Slack alert error:', e)
  }
}

// ─────────────────────────────────────────
// TELEGRAM ALERT
// ─────────────────────────────────────────
export async function sendTelegramAlert(payload: AlertPayload): Promise<void> {
  const botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID

  if (!botToken || !chatId ||
    botToken.includes('your_telegram') ||
    chatId.includes('your_chat')) return

  const verdictEmoji = payload.verdict === 'fabricated' ? '🚨' : '⚠️'
  const confidenceEmoji = payload.confidence === 'high' ? '🔴' : payload.confidence === 'medium' ? '🟡' : '🟢'

  const topSource = payload.references?.[0]
  const redFlagsText = payload.red_flags?.slice(0, 3)
    .map(f => `▪ ${f}`)
    .join('\n') || 'None'

  const message = `${verdictEmoji} *FABRICATED HADITH DETECTED*

📋 *Claim:*
${payload.claim_summary}

${confidenceEmoji} *Verdict:* ${payload.verdict} (${payload.confidence} confidence)

🚩 *Red flags:*
${redFlagsText}

🔬 *Analysis:*
${payload.analysis.slice(0, 300)}

📖 *Authentic alternative:*
${payload.authentic_alternative?.slice(0, 200) || 'See source'}

${topSource?.url ? `🔗 *Source:* [${topSource.source}](${topSource.url})` : ''}

💬 *Ready-to-post comment (${payload.lang.toUpperCase()}):*
\`\`\`
${payload.suggested_comment?.slice(0, 400)}
\`\`\`

⚠️ _AI flags — human admin decides action_`

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Telegram alert failed:', data.description)
    } else {
      console.log('Telegram alert sent successfully')
    }
  } catch (e) {
    console.error('Telegram alert error:', e)
  }
}

// ─────────────────────────────────────────
// SEND ALL ALERTS
// ─────────────────────────────────────────
export async function sendAlerts(payload: AlertPayload): Promise<void> {
  // Only alert for fabricated or weak verdicts
  if (payload.verdict !== 'fabricated' && payload.verdict !== 'weak') return

  // Send both alerts in parallel
  await Promise.allSettled([
    sendSlackAlert(payload),
    sendTelegramAlert(payload)
  ])
}
