@echo off
chcp 65001 >nul
title RL Replay Uploader - installation
echo Installation : analyse locale des replays Rocket League + envoi a ton app (et a ballchasing).
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rl-replay-uploader.ps1" -Install
echo.
pause
