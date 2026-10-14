@echo off
title SwitchVault Launcher
cd /d "%~dp0"

echo ===================================================
echo             SWITCHVAULT - GAME VAULT
echo ===================================================
echo [1/2] Iniciando o servidor FastAPI em segundo plano...

:: Inicia o backend silenciosamente usando o executavel do virtualenv
start /min cmd /c ""%~dp0.venv\Scripts\python.exe" -m uvicorn main:app --port 8000 --app-dir backend"

:: Aguarda o servidor concluir a inicializacao
timeout /t 2 /nobreak >nul

echo [2/2] Abrindo a interface em Modo Console...

:: Abre em janela de aplicativo (App Mode) sem barras do navegador
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:8000
    exit
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:8000
    exit
)

start http://localhost:8000
exit