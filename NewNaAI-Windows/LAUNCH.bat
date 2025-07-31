@echo off
title NewNa.AI Launcher
color 0A
mode con: cols=80 lines=30

:menu
cls
echo ============================================================
echo                   NewNa.AI Desktop App
echo ============================================================
echo.
echo Please choose an option:
echo.
echo   1. Run Pre-built App (Recommended)
echo   2. Run with Node.js (Development)
echo   3. Install Dependencies
echo   4. Check System Requirements
echo   5. Exit
echo.
echo ============================================================
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto runexe
if "%choice%"=="2" goto runnode
if "%choice%"=="3" goto install
if "%choice%"=="4" goto check
if "%choice%"=="5" goto end

echo Invalid choice! Please try again.
pause
goto menu

:runexe
cls
echo Starting Pre-built App...
echo ========================
echo.
if exist "dist\win-unpacked\NewNa.AI.exe" (
    start "" "dist\win-unpacked\NewNa.AI.exe"
    echo NewNa.AI has been launched!
    echo.
    echo The app should open in a new window.
    echo You can close this window now.
) else (
    echo ERROR: Pre-built app not found!
    echo Please use option 2 to run with Node.js
)
echo.
pause
goto menu

:runnode
cls
echo Starting with Node.js...
echo =======================
echo.
if exist "package.json" (
    echo Found package.json
    call npm start
) else (
    echo ERROR: package.json not found!
    echo Make sure you're in the NewNaAI-Windows folder
)
echo.
pause
goto menu

:install
cls
echo Installing Dependencies...
echo =========================
echo.
call npm install
echo.
echo Installation complete!
pause
goto menu

:check
cls
echo System Requirements Check
echo ========================
echo.
echo Checking Node.js...
node --version 2>nul
if errorlevel 1 (
    echo [FAIL] Node.js is not installed
    echo        Download from: https://nodejs.org/
) else (
    echo [PASS] Node.js is installed
)
echo.
echo Checking npm...
npm --version 2>nul
if errorlevel 1 (
    echo [FAIL] npm is not installed
) else (
    echo [PASS] npm is installed
)
echo.
echo Checking current directory...
echo Current: %cd%
echo.
echo Files in directory:
dir /b *.json 2>nul
echo.
pause
goto menu

:end
exit