param([int]$RootId = 19792, [string]$ScriptName = 'trace-member-bootstrap-rc128.mjs')
$ErrorActionPreference = 'Stop'
$all = @(Get-CimInstance Win32_Process)
$root = $all | Where-Object { $_.ProcessId -eq $RootId }
if (-not $root -or $root.CommandLine -notlike "*$ScriptName*") { throw 'Trace ownership changed' }
$ids = @($RootId)
do {
 $children = @($all | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids })
 $ids += @($children | ForEach-Object { $_.ProcessId })
} while ($children.Count -gt 0)
$all | Where-Object { $_.ProcessId -in $ids } | Select-Object ProcessId,ParentProcessId,Name,@{N='Headless';E={$_.CommandLine -like '*--headless*'}},@{N='Playwright';E={$_.CommandLine -like '*playwright*'}} | ConvertTo-Json
foreach ($item in ($all | Where-Object { $_.ProcessId -in $ids -and $_.ProcessId -ne $RootId })) {
 if ($item.Name -ne 'chrome-headless-shell.exe' -and -not ($item.Name -eq 'chrome.exe' -and $item.CommandLine -like '*playwright*')) { throw 'Unexpected descendant; no cleanup' }
}
foreach ($targetId in ($ids | Sort-Object -Descending)) { Stop-Process -Id $targetId -Force -ErrorAction SilentlyContinue }
