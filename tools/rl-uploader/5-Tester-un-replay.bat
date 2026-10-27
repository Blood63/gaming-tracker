@echo off
chcp 65001 >nul
set "RLU=%LOCALAPPDATA%\rl-replay-uploader\rl-replay-uploader.ps1"
if not exist "%RLU%" set "RLU=%~dp0rl-replay-uploader.ps1"
title Tester un replay
echo Glisse un fichier .replay sur cette fenetre puis appuie sur Entree (rien n'est envoye) :
set /p F=
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%RLU%" -TestFile %F%
echo.
pause
