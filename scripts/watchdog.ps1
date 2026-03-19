$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\Lyzing\.openclaw\workspace\mobile-office-bridge'
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$logFile = Join-Path $logs 'watchdog.log'
function Log($msg) { "$(Get-Date -Format s) $msg" | Out-File -FilePath $logFile -Append -Encoding utf8 }

$bridgeScript = Join-Path $root 'scripts\start-bridge.ps1'
$frpcScript = Join-Path $root 'scripts\start-frpc.ps1'

$bridgeHealthy = $false
try {
  $resp = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 8
  if ($resp.StatusCode -eq 200 -and $resp.Content -match '"status"\s*:\s*"ok"') { $bridgeHealthy = $true }
} catch {}

$frpcRunning = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -ieq 'frpc.exe' }).Count -gt 0
$nodeBridgeRunning = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -ieq 'node.exe' -and $_.CommandLine -match 'mobile-office-bridge\\server.js' }).Count -gt 0

if (-not $nodeBridgeRunning -or -not $bridgeHealthy) {
  Log "bridge unhealthy: node=$nodeBridgeRunning health=$bridgeHealthy, restarting"
  Get-CimInstance Win32_Process | Where-Object { $_.Name -ieq 'node.exe' -and $_.CommandLine -match 'mobile-office-bridge\\server.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Start-Process powershell -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$bridgeScript)
  Start-Sleep -Seconds 5
}

if (-not $frpcRunning) {
  Log 'frpc not running, restarting'
  Start-Process powershell -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$frpcScript)
  Start-Sleep -Seconds 3
}

try {
  $resp2 = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 8
  Log "post-check bridge status=$($resp2.StatusCode)"
} catch {
  Log "post-check bridge failed: $($_.Exception.Message)"
}
Log "post-check frpc running=$(@(Get-CimInstance Win32_Process | Where-Object { $_.Name -ieq 'frpc.exe' }).Count -gt 0)"
