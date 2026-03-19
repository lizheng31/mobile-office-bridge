@echo off
setlocal
cd /d D:\mobile-office-bridge-git
if not exist logs mkdir logs
echo ==== %date% %time% start bridge ====>> logs\bridge.log
node server.js >> logs\bridge.log 2>&1
