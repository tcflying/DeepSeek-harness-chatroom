$ErrorActionPreference = 'Stop'
Start-Transcript -LiteralPath 'G:\codex-project\dsh-chatroom-next\review-artifacts\avatar-rc1.5-production-install.log' -Force | Out-Null
try {
  & 'G:\codex-project\dsh-chatroom-next\review-artifacts\install-integration-package.ps1' -Target Production -Version '1.5.0-codex.rc1.5'
} catch {
  Write-Error $_
  exit 1
} finally {
  Stop-Transcript | Out-Null
}
