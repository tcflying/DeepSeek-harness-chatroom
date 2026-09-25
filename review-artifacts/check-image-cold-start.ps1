$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
if (Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue) { throw 'Test port already occupied' }
$stdout = 'C:/Users/datoo/.dsh/chatroom-next-test/image-cold-rc114.stdout.log'
$stderr = 'C:/Users/datoo/.dsh/chatroom-next-test/image-cold-rc114.stderr.log'
$runner = Start-Process -FilePath "$PSHOME/powershell.exe" -ArgumentList @('-NoProfile','-File','G:/codex-project/dsh-chatroom-next/review-artifacts/run-integration-test.ps1') -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $result = Invoke-RestMethod 'http://127.0.0.1:3186/plugins/deepseek-harness-chatroom/api/health' -TimeoutSec 2
      if ($result.ready) { $ready = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Cold-start health did not become ready' }
  & 'C:/Program Files/nodejs/node.exe' 'G:/codex-project/dsh-chatroom-next/review-artifacts/check-test-client-asset.mjs' $stdout
  if ($LASTEXITCODE -ne 0) { throw 'Cold-start client asset check failed' }
  Write-Output 'Cold startup with the persistent rc1.14 overlay passed.'
} finally {
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($runner.Id)"
  foreach ($child in $children) {
    if ($child.Name -eq 'node.exe' -and $child.CommandLine -match '--port\s+3186') {
      Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue
    }
  }
  $runner.Refresh()
  if (-not $runner.HasExited) { Stop-Process -Id $runner.Id }
}
if (Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue) { throw 'Cold-start test listener still running' }
Write-Output 'One-time cold-start instance stopped; production was not restarted.'
