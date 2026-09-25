$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
$package = 'C:/Users/datoo/.dsh/chatroom-next-test/packs/deepseek-harness-chatroom-1.5.0-codex.rc1.14.tgz'
$roots = @('C:/Users/datoo/.dsh/chatroom-next-test/profiles/web', 'C:/Users/datoo/.dsh/chatroom-server/profiles/web')
$entries = & tar -tf $package
if ($LASTEXITCODE -ne 0) { throw 'Package listing failed' }
foreach ($entry in $entries) {
  if ($entry -notmatch '^package/[A-Za-z0-9_./-]+$' -or $entry -match '(^|/)\.\.(/|$)') { throw 'Unsafe package member' }
}
foreach ($root in $roots) {
  $target = Join-Path $root 'plugin-releases/chatroom-1.5.0-codex.rc1.14'
  if (-not (Test-Path -LiteralPath $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
    & tar -xf $package --strip-components 1 -C $target
    if ($LASTEXITCODE -ne 0) { throw 'Package extraction failed' }
  }
  $metadata = Get-Content -LiteralPath (Join-Path $target 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($metadata.version -ne '1.5.0-codex.rc1.14') { throw 'Unexpected package version' }
  foreach ($bundle in @('dist/index.js', 'dist/client.js')) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $target $bundle) -Algorithm SHA256).Hash
    $expected = (Get-FileHash -LiteralPath (Join-Path 'G:/codex-project/dsh-chatroom-next' $bundle) -Algorithm SHA256).Hash
    if ($actual -ne $expected) { throw 'Bundle hash mismatch' }
    [pscustomobject]@{ Release = $target; Bundle = $bundle; Sha256 = $actual }
  }
}
Get-FileHash -LiteralPath $package -Algorithm SHA256
