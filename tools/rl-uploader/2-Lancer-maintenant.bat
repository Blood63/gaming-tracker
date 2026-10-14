@echo off
chcp 65001 >nul
title RL Replay Uploader
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rl-replay-uploader.ps1"
pause
