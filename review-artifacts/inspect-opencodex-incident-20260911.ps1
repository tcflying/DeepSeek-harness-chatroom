$ErrorActionPreference = 'Stop'
$events = Get-WinEvent -FilterHashtable @{ LogName='System'; ProviderName='Service Control Manager'; StartTime=[datetime]'2026-09-11 13:20:00'; EndTime=[datetime]'2026-09-11 13:50:00' } -ErrorAction SilentlyContinue
$events | Where-Object { $_.Message -match 'opencodex|Servy' } | Select-Object TimeCreated, Id, Message | Format-List
Get-CimInstance Win32_Service | Where-Object { $_.Name -match 'opencodex' } | Select-Object Name, State, ProcessId, StartName
Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq 5780 } | Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath
