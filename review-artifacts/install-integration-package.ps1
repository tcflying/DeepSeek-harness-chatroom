param(
  [ValidateSet('Test','Production')][string]$Target = 'Test',
  [ValidateSet('1.5.0-codex.rc1.3','1.5.0-codex.rc1.4','1.5.0-codex.rc1.5','1.5.0-codex.rc1.6','1.5.0-codex.rc1.7','1.5.0-codex.rc1.8','1.5.0-codex.rc1.9','1.5.0-codex.rc1.10','1.5.0-codex.rc1.11','1.5.0-codex.rc1.12','1.5.0-codex.rc1.13')][string]$Version = '1.5.0-codex.rc1.3'
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1')
$root = if ($Target -eq 'Test') { 'C:\Users\datoo\.dsh\chatroom-next-test' } else { 'C:\Users\datoo\.dsh\chatroom-server' }
$profile = Join-Path $root 'profiles\web'
$packageDirectory = if ($Target -eq 'Test') { 'C:\Users\datoo\.dsh\chatroom-next-test\packs' } else { 'C:\Users\datoo\.dsh\plugins-src' }
$package = Join-Path $packageDirectory "deepseek-harness-chatroom-$Version.tgz"
$backup = Join-Path 'C:\Users\datoo\.dsh\service\backups' ("integration-$Version-$Target-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$plugin = Join-Path $profile 'node_modules\deepseek-harness-chatroom'
$core = 'C:\Users\datoo\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\lib\bin.js'
$cli = 'C:\Program Files\Servy\servy-cli.exe'
$canStart = $true
$coreBefore = (Get-FileHash -LiteralPath $core -Algorithm SHA256).Hash
$oldPackage = Get-Content -LiteralPath (Join-Path $plugin 'package.json') -Raw | ConvertFrom-Json
$modules = Get-Content -LiteralPath (Join-Path $profile 'node_modules\.modules.yaml') -Raw | ConvertFrom-Json
$manager = $modules.packageManager
if ($manager -notin @('pnpm@10.33.4','pnpm@11.8.0')) { throw "Unreviewed profile package manager: $manager" }
$store = Split-Path -Parent $modules.storeDir
$newPackage = Get-Content -LiteralPath 'G:\codex-project\dsh-chatroom-next\package.json' -Raw | ConvertFrom-Json
if (($oldPackage.dependencies | ConvertTo-Json -Compress) -ne ($newPackage.dependencies | ConvertTo-Json -Compress)) { throw 'Dependency change requires separate install review.' }
if (($oldPackage.peerDependencies | ConvertTo-Json -Compress) -ne ($newPackage.peerDependencies | ConvertTo-Json -Compress)) { throw 'Harness peer dependency change is not authorized.' }
if (-not (Test-Path -LiteralPath $package)) { throw 'Built package is missing.' }
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $plugin -Destination (Join-Path $backup 'plugin') -Recurse
foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.yml','cordis.patch.yml')) {
  Copy-Item -LiteralPath (Join-Path $profile $name) -Destination (Join-Path $backup $name)
}
Write-Output "BACKUP=$backup"
if ($Target -eq 'Production') {
  & $cli stop --name dsh-chatroom --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the existing production service.' }
} else {
  $listener = Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue
  foreach ($item in $listener) {
    $process = Get-Process -Id $item.OwningProcess
    if ($process.Path -ne 'C:\Program Files\nodejs\node.exe') { throw 'Unexpected process owns test port 3186.' }
    Stop-Process -Id $process.Id
    $process.WaitForExit(15000) | Out-Null
  }
}
try {
  Set-Location -LiteralPath $profile
  $canStart = $false
  & 'C:\Program Files\nodejs\corepack.cmd' $manager add $package --offline --ignore-scripts --config.auto-install-peers=false --store-dir $store
  if ($LASTEXITCODE -ne 0) { throw 'Offline package installation failed; retained backup is the recovery source.' }
  $installed = Get-Content -LiteralPath (Join-Path $plugin 'package.json') -Raw | ConvertFrom-Json
  if ($installed.version -ne $Version) { throw 'Installed version mismatch.' }
  if (-not (Test-Path -LiteralPath (Join-Path $plugin 'NOTICE.md'))) { throw 'Third-party asset notice missing.' }
  foreach ($name in @('index.js','client.js')) {
    $expected = (Get-FileHash -LiteralPath (Join-Path 'G:\codex-project\dsh-chatroom-next\dist' $name) -Algorithm SHA256).Hash
    $actual = (Get-FileHash -LiteralPath (Join-Path (Join-Path $plugin 'dist') $name) -Algorithm SHA256).Hash
    if ($actual -ne $expected) { throw "Installed bundle mismatch: $name" }
    Write-Output "$name SHA256=$actual"
  }
  if ((Get-FileHash -LiteralPath $core -Algorithm SHA256).Hash -ne $coreBefore) { throw 'Harness binary changed unexpectedly.' }
  Write-Output "INSTALLED=$($installed.version) CORE_UNCHANGED=True"
  $canStart = $true
} catch {
  $failure = $_
  $oldManifest = Get-Content -LiteralPath (Join-Path $backup 'package.json') -Raw | ConvertFrom-Json
  $oldPath = $oldManifest.dependencies.'deepseek-harness-chatroom'
  if (-not $oldPath.StartsWith('file:')) { throw 'Cannot automatically restore a non-file dependency.' }
  $oldPath = $oldPath.Substring(5)
  if (-not (Test-Path -LiteralPath $oldPath)) { throw 'Previous package is missing; production restart needs manual recovery from the retained backup.' }
  & 'C:\Program Files\nodejs\corepack.cmd' $manager add $oldPath --offline --ignore-scripts --config.auto-install-peers=false --store-dir $store
  if ($LASTEXITCODE -ne 0) { throw 'Rollback installation failed; retained backup requires recovery before production can start.' }
  foreach ($name in @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml')) {
    Copy-Item -LiteralPath (Join-Path $backup $name) -Destination (Join-Path $profile $name) -Force
  }
  Write-Output "ROLLED_BACK=$($oldPackage.version)"
  $canStart = $true
  throw $failure
} finally {
  if ($Target -eq 'Production' -and $canStart) {
    & $cli start --name dsh-chatroom --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Production service restart failed.' }
  }
}
