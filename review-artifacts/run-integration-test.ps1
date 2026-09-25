$ErrorActionPreference = 'Stop'
$env:DSH_HOME = 'C:\Users\datoo\.dsh\chatroom-next-test'
$env:DSH_CHATROOM_CWD = 'G:\codex-project\dsh-chatroom-next'
$env:DSH_CHATROOM_WECOM = 'disabled'
$env:DSH_CHATROOM_IMAGE_BASE_URL = 'http://127.0.0.1:10100/v1'
$env:DSH_TELEMETRY_DISABLED = '1'
# Preserve the existing loopback-only test instance's guest-identity mode.
Remove-Item Env:DSH_CHATROOM_AUTH_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:DSH_CHATROOM_AUTH_BOOTSTRAP_TOKEN -ErrorAction SilentlyContinue
Set-Location -LiteralPath 'C:\Users\datoo\.dsh\chatroom-next-test\profiles\web'
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\datoo\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js' '--profile' 'web' '--patch' 'G:/codex-project/dsh-chatroom-next/review-artifacts/integration-diagnostics.yml' '--no-open' '--host' '127.0.0.1' '--port' '3186'
exit $LASTEXITCODE
