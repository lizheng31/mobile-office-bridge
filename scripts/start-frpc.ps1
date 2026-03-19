$ErrorActionPreference = 'Stop'
$frpDir = 'C:\Users\Lyzing\frp\frp_0.58.1_windows_amd64'
$logs = 'C:\Users\Lyzing\.openclaw\workspace\mobile-office-bridge\logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$logFile = Join-Path $logs 'frpc.log'
Set-Location $frpDir
"`n==== $(Get-Date -Format s) start frpc ==== " | Out-File -FilePath $logFile -Append -Encoding utf8
.\frpc.exe -c .\frpc.toml *>> $logFile
