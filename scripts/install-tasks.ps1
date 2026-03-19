$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Lyzing\.openclaw\workspace\mobile-office-bridge'
$bridge = Join-Path $root 'scripts\start-bridge.ps1'
$frpc = Join-Path $root 'scripts\start-frpc.ps1'
$watchdog = Join-Path $root 'scripts\watchdog.ps1'

schtasks /Create /F /TN "MobileOfficeBridge" /SC ONLOGON /RL HIGHEST /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"$bridge\""
schtasks /Create /F /TN "MobileOfficeFrpc" /SC ONLOGON /RL HIGHEST /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"$frpc\""
schtasks /Create /F /TN "MobileOfficeWatchdog" /SC MINUTE /MO 1 /RL HIGHEST /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"$watchdog\""

Write-Host 'Scheduled tasks installed.'
