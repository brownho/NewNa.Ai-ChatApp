@echo off
:: Double-click this file to start NewNa.AI

:: Method 1: Open new window with /K to keep it open
start "NewNa.AI Desktop App" cmd /K "cd /d %~dp0 && cls && echo NewNa.AI Desktop App && echo ================== && echo. && npm start || (echo. && echo ERROR: Failed to start. Make sure Node.js is installed. && echo. && pause)"