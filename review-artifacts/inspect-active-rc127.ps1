Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','powershell.exe') -and $_.CommandLine -match 'check-isolated-rc127|verify-isolated-rc127|vitest|check:ci|run-integration-test|3186' } | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | Format-List
Get-ChildItem -LiteralPath 'C:/Users/datoo/AppData/Local' -Directory | Where-Object { $_.Name -match 'codex|openai' } | Select-Object FullName
Get-ChildItem -LiteralPath 'C:/Users/datoo/AppData/Roaming' -Directory | Where-Object { $_.Name -match 'codex|openai' } | Select-Object FullName
Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -in @(76556,82572) } | Select-Object ProcessId,ParentProcessId,Name,CreationDate | Format-Table
Get-ChildItem -LiteralPath 'G:/codex-project/dsh-chatroom-next/review-artifacts' -Filter 'RC127-*' | Select-Object Name,Length,LastWriteTime
Get-ChildItem -LiteralPath 'C:/Users/datoo/AppData/Roaming/Codex' -Directory | Select-Object Name
Get-ChildItem -LiteralPath 'C:/Users/datoo/AppData/Local/Codex' -Directory | Select-Object Name
