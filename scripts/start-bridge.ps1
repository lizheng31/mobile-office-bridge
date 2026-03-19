$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Lyzing\.openclaw\workspace\mobile-office-bridge'
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$logFile = Join-Path $logs 'bridge.log'
Set-Location $root
"`n==== $(Get-Date -Format s) start bridge ==== " | Out-File -FilePath $logFile -Append -Encoding utf8
node server.js *>> $logFile
