@echo off
chcp 65001 >nul
set "RLU=%LOCALAPPDATA%\rl-replay-uploader\rl-replay-uploader.ps1"
if not exist "%RLU%" set "RLU=%~dp0rl-replay-uploader.ps1"
title RL Replay Uploader
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%RLU%" -Once
echo.
pause
