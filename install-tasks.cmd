@echo off
set TASK1=MobileOfficeBridgeGit
set TASK2=MobileOfficeFrpcGit
set TASK3=MobileOfficeWatchdogGit
schtasks /Delete /TN "%TASK1%" /F >nul 2>nul
schtasks /Delete /TN "%TASK2%" /F >nul 2>nul
schtasks /Delete /TN "%TASK3%" /F >nul 2>nul
schtasks /Create /SC ONLOGON /RL HIGHEST /TN "%TASK1%" /TR "D:\mobile-office-bridge-git\start-bridge.bat" /F
schtasks /Create /SC ONLOGON /RL HIGHEST /TN "%TASK2%" /TR "D:\mobile-office-bridge-git\start-frpc.bat" /F
schtasks /Create /SC MINUTE /MO 2 /RL HIGHEST /TN "%TASK3%" /TR "D:\mobile-office-bridge-git\watchdog.cmd" /F
