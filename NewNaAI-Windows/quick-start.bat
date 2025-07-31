@echo off
echo NewNa.AI Windows App Quick Start
echo ================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not found in PATH!
    echo Please ensure Node.js is properly installed.
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Please check the error messages above.
        echo.
        pause
        exit /b 1
    )
    echo.
)

echo Starting NewNa.AI Desktop App...
echo.
echo Press Ctrl+C to stop
echo.

call npm start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start the application!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

pause