@echo off
title NewNa.AI Setup and Run
color 0A

echo ==========================================
echo     NewNa.AI Windows App - Setup
echo ==========================================
echo.
echo This window will stay open...
echo.

:: Change to the directory where this batch file is located
cd /d "%~dp0"

echo Current directory: %cd%
echo.

:: Check if Node.js exists
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version for Windows.
    echo.
    echo Press any key to exit...
    pause >nul
    exit
)

:: Show Node version
echo Found Node.js:
node --version
echo.

:: Check if npm exists
echo Checking for npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not found!
    echo Node.js is installed but npm is missing.
    echo Please reinstall Node.js.
    echo.
    echo Press any key to exit...
    pause >nul
    exit
)

:: Show npm version
echo Found npm:
npm --version
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    npm install
    echo.
    echo Installation complete!
    echo.
)

:: Start the app
echo ==========================================
echo Starting NewNa.AI Desktop App...
echo ==========================================
echo.
echo The app will start in a moment...
echo Press Ctrl+C to stop the app.
echo.

:: Run the app - this will keep the window open
npm start

:: If npm start exits, pause
echo.
echo ==========================================
echo App has stopped.
echo ==========================================
echo.
pause