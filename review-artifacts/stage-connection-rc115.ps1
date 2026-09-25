param([ValidatePattern('^1\.5\.0-codex\.rc1\.(?:1[5-9]|[2-5][0-9])$')][string]$Version = '1.5.0-codex.rc1.40')
$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
$package = "C:/Users/datoo/.dsh/chatroom-next-test/packs/deepseek-harness-chatroom-$Version.tgz"
$entries = & tar -tf $package
if ($LASTEXITCODE -ne 0) { throw 'Package listing failed' }
foreach ($entry in $entries) {
  if ($entry -notmatch '^package/[A-Za-z0-9_./-]+$' -or $entry -match '(^|/)\.\.(/|$)') { throw 'Unsafe package member' }
}
foreach ($root in @('C:/Users/datoo/.dsh/chatroom-next-test/profiles/web','C:/Users/datoo/.dsh/chatroom-server/profiles/web')) {
  $target = Join-Path $root "plugin-releases/chatroom-$Version"
  if (Test-Path -LiteralPath $target) { throw 'Immutable release already exists; do not overwrite it' }
  New-Item -ItemType Directory -Path $target | Out-Null
  & tar -xf $package --strip-components 1 -C $target
  if ($LASTEXITCODE -ne 0) { throw 'Extraction failed' }
  foreach ($bundle in @('dist/index.js','dist/client.js')) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $target $bundle) -Algorithm SHA256).Hash
    $expected = (Get-FileHash -LiteralPath (Join-Path 'G:/codex-project/dsh-chatroom-next' $bundle) -Algorithm SHA256).Hash
    if ($actual -ne $expected) { throw 'Bundle hash mismatch' }
    [pscustomobject]@{ Release = $target; Bundle = $bundle; Sha256 = $actual }
  }
}
