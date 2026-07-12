@echo off
cd /d "%~dp0"

set /p MENSAGEM=Digite uma descricao da atualizacao: 

if "%MENSAGEM%"=="" (
    set MENSAGEM=Atualiza projeto Dropshipping
)

powershell -ExecutionPolicy Bypass -File "%~dp0atualizar.ps1" -Mensagem "%MENSAGEM%"

echo.
pause