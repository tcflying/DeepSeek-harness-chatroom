param([ValidateSet('Start','Stop')][string]$Action = 'Start')
$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue)
if ($Action -eq 'Stop') {
  foreach ($listener in $listeners) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if ($process.Name -ne 'node.exe' -or $process.CommandLine -notmatch '--port\s+3186' -or $process.CommandLine -notmatch 'integration-diagnostics.yml') { throw 'Unexpected test owner; refusing stop' }
    Stop-Process -Id $process.ProcessId
  }
  Write-Output 'Stopped only the owned isolated port-3186 instance.'
  exit
}
if ($listeners.Count -gt 0) { throw 'Test port already occupied' }
$stdout = 'C:/Users/datoo/.dsh/chatroom-next-test/connection-rc115.stdout.log'
$stderr = 'C:/Users/datoo/.dsh/chatroom-next-test/connection-rc115.stderr.log'
Start-Process -FilePath "$PSHOME/powershell.exe" -ArgumentList @('-NoProfile','-File','G:/codex-project/dsh-chatroom-next/review-artifacts/run-integration-test.ps1') -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
for ($i = 0; $i -lt 45; $i++) {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:3186/plugins/deepseek-harness-chatroom/api/health' -TimeoutSec 1
    if ($health.ready -and $health.diagnostics.healthy) { $health | ConvertTo-Json -Compress; exit }
  } catch {}
  Start-Sleep -Milliseconds 500
}
throw 'Isolated service did not become healthy'
