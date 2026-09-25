param([switch]$StopTest)
$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME/Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1"
$services = Get-CimInstance Win32_Service -Filter "Name='dsh-chatroom' OR Name='dsh-sandbox-probe'"
$test = Get-CimInstance Win32_Process -Filter 'ProcessId=62948'
$parent = Get-CimInstance Win32_Process -Filter 'ProcessId=22444'
[pscustomobject]@{
  Services = @($services | Select-Object Name, State, StartName, ProcessId, StartMode)
  Listeners = @(Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3181,3186 | Select-Object LocalAddress,LocalPort,OwningProcess)
  Test = $test | Select-Object ProcessId,ParentProcessId,Name,CommandLine
  Parent = $parent | Select-Object ProcessId,ParentProcessId,Name,CommandLine
} | ConvertTo-Json -Depth 4
if ($StopTest) {
  if ($test.Name -ne 'node.exe' -or $test.ParentProcessId -ne 22444 -or $test.CommandLine -notmatch '--port\s+3186' -or $parent.CommandLine -notmatch 'run-integration-test\.ps1') {
    throw 'Test process ownership changed; refusing cleanup'
  }
  Stop-Process -Id $test.ProcessId
  Wait-Process -Id $test.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
  if (Get-NetTCPConnection -State Listen -LocalPort 3186 -ErrorAction SilentlyContinue) { throw 'Test listener still running' }
  Write-Output 'Only the verified one-time port-3186 child was stopped.'
}
