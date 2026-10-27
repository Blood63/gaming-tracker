@echo off
chcp 65001 >nul
set "RLU=%LOCALAPPDATA%\rl-replay-uploader\rl-replay-uploader.ps1"
if not exist "%RLU%" set "RLU=%~dp0rl-replay-uploader.ps1"
title Mise a jour
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%RLU%" -Update
echo.
pause
