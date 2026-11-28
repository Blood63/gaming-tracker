@echo off
chcp 65001 >nul
title RL Replay Uploader - installation
echo Installation : analyse locale des replays Rocket League + envoi des stats a ton app (le replay reste sur ton PC).
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rl-replay-uploader.ps1" -Install
echo.
pause
