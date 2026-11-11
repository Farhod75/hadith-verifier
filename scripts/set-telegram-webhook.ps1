# scripts/set-telegram-webhook.ps1
# P398: connect @HadithVerifierBot to hadithverifier.com. Run once after
# TELEGRAM_VERIFIER_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are saved in Vercel (Production)
# and the deployment that contains /api/telegram/webhook is live.
#
#   pwsh -File scripts/set-telegram-webhook.ps1
#
# It asks for the token and the secret (typed or pasted, never shown or saved), registers
# the webhook, and prints Telegram's own webhook status. The same two values as in Vercel.

$ErrorActionPreference = 'Stop'
$url = 'https://hadithverifier.com/api/telegram/webhook'

function Read-Secret([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

$token  = Read-Secret 'Bot token (from @BotFather)'
$secret = Read-Secret 'Webhook secret (the TELEGRAM_WEBHOOK_SECRET value)'
if (-not $token -or -not $secret) { throw 'both values are required' }

$body = @{
  url                  = $url
  secret_token         = $secret
  allowed_updates      = '["message"]'
  drop_pending_updates = 'true'
}
$r = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body $body
"setWebhook: ok=$($r.ok) $($r.description)"

$i = (Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo").result
"url:             $($i.url)"
"pending updates: $($i.pending_update_count)"
"last error:      $($i.last_error_message)"
$token = $null; $secret = $null
