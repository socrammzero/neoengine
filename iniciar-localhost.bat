@echo off
chcp 65001 >nul
title NeoEngine - Servidor Localhost de Pruebas
cd /d "%~dp0"
echo Iniciando servidor local de NeoEngine...
node server.js
pause
