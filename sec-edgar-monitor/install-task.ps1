param(
    [string]$PythonExe = "$PSScriptRoot\.venv\Scripts\python.exe",
    [string]$ConfigPath = "$PSScriptRoot\config.json",
    [string]$TaskName = 'SEC EDGAR Monitor'
)
$ErrorActionPreference = 'Stop'
$PythonExe = (Resolve-Path -LiteralPath $PythonExe).Path
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$MonitorPath = Join-Path $PSScriptRoot 'monitor.py'
$CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$ActionArgs = '"{0}" run --config "{1}"' -f $MonitorPath, $ConfigPath
$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument $ActionArgs -WorkingDirectory $PSScriptRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $CurrentUser
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$Principal = New-ScheduledTaskPrincipal -UserId $CurrentUser -LogonType Interactive -RunLevel Limited
$Task = New-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description 'Tesla and SpaceX SEC submissions monitor; see README for SMTP and unattended boot setup.'
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    throw "Task '$TaskName' already exists. Review or remove it in Task Scheduler before reinstalling."
}
Register-ScheduledTask -TaskName $TaskName -InputObject $Task | Out-Null
Write-Host "Created '$TaskName' for $CurrentUser at logon. See README to enable running before logon."
Write-Host "Start now: Start-ScheduledTask -TaskName '$TaskName'"
