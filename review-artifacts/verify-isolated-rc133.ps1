param([switch]$IsolatedNavProbe, [switch]$IsolatedAssetAuthProbe)

$ErrorActionPreference = 'Stop'

# Own only a cold, loopback test Host.  A pre-existing listener is never killed
# or reused: it may belong to a developer or production-adjacent instance.
$port = 3186
$base = 'G:/codex-project/dsh-chatroom-next/review-artifacts'
$node = 'C:/Program Files/nodejs/node.exe'
$powershell = (Get-Command powershell.exe -CommandType Application -ErrorAction Stop).Source
$runner = $null
$version = if ($env:RC_VERSION) { $env:RC_VERSION } else { '1.5.0-codex.rc1.33' }
if ($version -notmatch 'rc1\.(\d+)$') { throw "RC_VERSION must end in rc1.<number>; got $version" }
$release = "1$($Matches[1])"
$suffix = if ($env:RC_RECEIPT_SUFFIX) { $env:RC_RECEIPT_SUFFIX } else { '' }
if ($suffix -notmatch '^(?:|-[a-z0-9]+)$') { throw 'Invalid receipt suffix' }

function Get-DescendantProcesses([int]$ParentId) {
  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$ParentId" -ErrorAction SilentlyContinue)
  foreach ($child in $children) {
    Get-DescendantProcesses -ParentId $child.ProcessId
    $child
  }
}

if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
  throw "RC$release isolated acceptance refuses occupied test port $port"
}

try {
  $runner = Start-Process -FilePath $powershell -ArgumentList @(
    '-NoProfile', '-File', "$base/run-integration-test.ps1"
  ) -WindowStyle Hidden -RedirectStandardOutput "$base/RC$release-isolated$suffix.stdout.log" -RedirectStandardError "$base/RC$release-isolated$suffix.stderr.log" -PassThru

  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      if ((Invoke-RestMethod "http://127.0.0.1:$port/plugins/deepseek-harness-chatroom/api/health" -TimeoutSec 2).ready) {
        $ready = $true
        break
      }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw "RC$release isolated cold-start health did not become ready within 30 seconds" }

  if ($IsolatedNavProbe -and $IsolatedAssetAuthProbe) { throw 'choose only one isolated probe mode' }
  $browserMode = if ($IsolatedAssetAuthProbe) { '--isolated-asset-auth-probe' } elseif ($IsolatedNavProbe) { '--isolated-nav-probe' } else { '--isolated' }
  & $node "$base/verify-rc133-browser.mjs" $browserMode
  if ($LASTEXITCODE -ne 0) { throw "RC$release isolated browser acceptance failed; receipt retained" }
} finally {
  # Snapshot descendants before stopping the runner.  Do not select by port or
  # executable name: only this Start-Process tree is ours to stop.
  if ($null -ne $runner) {
    $owned = @(Get-DescendantProcesses -ParentId $runner.Id)
    foreach ($process in $owned) {
      Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
    }
    $runner.Refresh()
    if (-not $runner.HasExited) { Stop-Process -Id $runner.Id -ErrorAction SilentlyContinue }
  }
}

if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
  throw "RC$release owned isolated listener remained on port $port after cleanup"
}
Write-Output "RC$release isolated runner tree stopped; no pre-existing listener was touched."
