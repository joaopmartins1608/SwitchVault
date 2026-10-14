@echo off
echo A encerrar processos do SwitchVault...
taskkill /f /im uvicorn.exe >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq SwitchVault Launcher" /im cmd.exe >nul 2>&1
echo Concluido.
timeout /t 1 >nul
exit