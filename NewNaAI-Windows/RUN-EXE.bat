@echo off
echo Starting NewNa.AI Desktop App (Pre-built version)
echo ==============================================
echo.

cd /d "%~dp0"

if exist "dist\win-unpacked\NewNa.AI.exe" (
    echo Found pre-built app!
    echo Starting...
    echo.
    start "" "dist\win-unpacked\NewNa.AI.exe"
    echo App should be starting in a new window.
) else (
    echo ERROR: Pre-built app not found at dist\win-unpacked\NewNa.AI.exe
    echo.
    echo Current directory: %cd%
    echo.
    dir /b
)

echo.
echo This window will close in 10 seconds...
timeout /t 10