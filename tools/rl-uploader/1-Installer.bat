@echo off
chcp 65001 >nul
title RL Replay Uploader - installation
echo Installation de l'envoi automatique des replays Rocket League vers ballchasing.com...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rl-replay-uploader.ps1" -Install
echo.
pause
