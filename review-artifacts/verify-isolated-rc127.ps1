$ErrorActionPreference = 'Stop'
if (Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue) { throw 'Test port already occupied' }
$base = 'G:/codex-project/dsh-chatroom-next/review-artifacts'
$runner = Start-Process -FilePath "$PSHOME/powershell.exe" -ArgumentList @('-NoProfile','-File',"$base/run-integration-test.ps1") -WindowStyle Hidden -RedirectStandardOutput "$base/RC127-isolated-r2.stdout.log" -RedirectStandardError "$base/RC127-isolated-r2.stderr.log" -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try { if ((Invoke-RestMethod 'http://127.0.0.1:3186/plugins/deepseek-harness-chatroom/api/health' -TimeoutSec 2).ready) { $ready = $true; break } } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Cold-start health did not become ready' }
  & 'C:/Program Files/nodejs/node.exe' "$base/check-isolated-rc127.mjs"
  if ($LASTEXITCODE -ne 0) { throw 'Isolated acceptance failed' }
} finally {
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($runner.Id)"
  foreach ($child in $children) { if ($child.Name -eq 'node.exe' -and $child.CommandLine -match '--port\s+3186') { Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue } }
  $runner.Refresh(); if (-not $runner.HasExited) { Stop-Process -Id $runner.Id }
}
if (Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue) { throw 'Isolated listener still running' }
Write-Output 'Owned isolated listener stopped; production not restarted.'
