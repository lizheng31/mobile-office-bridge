@echo off
setlocal enabledelayedexpansion
if not exist D:\mobile-office-bridge-git\logs mkdir D:\mobile-office-bridge-git\logs
echo ==== %date% %time% watchdog tick ====>> D:\mobile-office-bridge-git\logs\watchdog.log
curl -s http://127.0.0.1:8080/health >nul 2>nul
if errorlevel 1 (
  echo [%date% %time%] bridge down, restarting>> D:\mobile-office-bridge-git\logs\watchdog.log
  start "bridge-git" /min D:\mobile-office-bridge-git\start-bridge.bat
) else (
  echo [%date% %time%] bridge ok>> D:\mobile-office-bridge-git\logs\watchdog.log
)
tasklist | findstr /I frpc.exe >nul 2>nul
if errorlevel 1 (
  echo [%date% %time%] frpc down, restarting>> D:\mobile-office-bridge-git\logs\watchdog.log
  start "frpc-git" /min D:\mobile-office-bridge-git\start-frpc.bat
) else (
  echo [%date% %time%] frpc ok>> D:\mobile-office-bridge-git\logs\watchdog.log
)
