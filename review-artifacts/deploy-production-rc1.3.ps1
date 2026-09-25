$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1')
Start-Transcript -LiteralPath 'G:\codex-project\dsh-chatroom-next\review-artifacts\integration-production-install.log' -Force | Out-Null
try {
  & 'G:\codex-project\dsh-chatroom-next\review-artifacts\install-integration-package.ps1' -Target Production
  Write-Output 'DEPLOYMENT_EXIT=0'
} catch {
  Write-Output "DEPLOYMENT_ERROR=$($_.Exception.Message)"
  Write-Output 'DEPLOYMENT_EXIT=1'
  Stop-Transcript | Out-Null
  exit 1
}
Stop-Transcript | Out-Null
exit 0
