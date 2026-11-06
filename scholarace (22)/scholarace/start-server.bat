@echo off
cd /d "%~dp0"
if not exist server\.env copy server\.env.example server\.env
node server\server.js
pause
