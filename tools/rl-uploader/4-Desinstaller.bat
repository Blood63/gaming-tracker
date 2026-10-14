@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rl-replay-uploader.ps1" -Uninstall
pause
