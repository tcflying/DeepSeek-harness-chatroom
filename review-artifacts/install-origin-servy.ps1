$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
$record = 'G:/codex-project/dsh-chatroom-next/review-artifacts/ORIGIN-SERVY-20260911.json'
$result = @{ at = [DateTime]::UtcNow.ToString('o'); installed = $false; cutover = $false }
try {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator token required to register the service' }
  $cli = 'C:/Program Files/Servy/servy-cli.exe'
  $node = 'C:/Program Files/nodejs/node.exe'
  if (-not (Test-Path -LiteralPath $node)) { throw 'Protected Node runtime not found' }
  $name = 'dsh-chatroom-origin'
  $state = & $cli status --name $name
  if ($state -notmatch 'NotInstalled') { throw 'Existing registration found; refusing duplicate install' }
  $owner = Get-CimInstance Win32_Process -Filter 'ProcessId=5800'
  $listener = Get-NetTCPConnection -State Listen -LocalPort 3185
  if ($owner.Name -ne 'node.exe' -or $owner.CommandLine -notmatch 'chatroom-origin-proxy\.js' -or $listener.OwningProcess -ne 5800) { throw 'Original bridge ownership changed; refusing cutover' }
  $root = 'C:/ProgramData/Servy/managed-apps/dsh-chatroom-origin'
  if (Test-Path -LiteralPath $root) { throw 'Target already exists; inspect before overwriting' }
  New-Item -ItemType Directory -Path $root | Out-Null
  & icacls $root /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Failed to protect service code directory' }
  Copy-Item -LiteralPath 'G:/codex-project/dsh-chatroom-next/scripts/chatroom-origin-bridge.cjs' -Destination "$root/chatroom-origin-bridge.cjs"
  Copy-Item -LiteralPath 'C:/Users/datoo/.dsh/service/chatroom-origin-proxy.js' -Destination "$root/original-proxy.backup.js"
  $result.sourceSha256 = (Get-FileHash -LiteralPath "$root/chatroom-origin-bridge.cjs" -Algorithm SHA256).Hash
  $install = & $cli install --name $name --description 'Loopback-only chatroom origin bridge with stream lifecycle cleanup; fixed target 127.0.0.1:3181' --path $node --startupDir $root --params "$root/chatroom-origin-bridge.cjs" --startupType Automatic --stdout 'C:/ProgramData/Servy/managed-logs/dsh-chatroom-origin.out.log' --stderr 'C:/ProgramData/Servy/managed-logs/dsh-chatroom-origin.err.log' --enableSizeRotation --rotationSize 4 --maxRotations 3 --enableHealth --heartbeatInterval 10 --maxFailedChecks 3 --recoveryAction RestartProcess --maxRestartAttempts 10 --stopTimeout 10 --quiet 2>&1
  $result.installOutput = ($install | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Servy install failed; original bridge remains running' }
  $result.installed = $true
  Stop-Process -Id 5800
  $result.startOutput = (& $cli start --name $name --quiet 2>&1 | Out-String).Trim()
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $health = Invoke-RestMethod 'http://127.0.0.1:3185/__bridge_health' -TimeoutSec 1
      if ($health.ready) { $result.health = $health; $result.cutover = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $result.cutover) { throw 'New service health did not become ready; inspect registration and logs' }
  $result.status = (& $cli status --name $name | Out-String).Trim()
} catch { $result.error = $_.Exception.Message }
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $record -Encoding UTF8
if ($result.error) { exit 1 }
