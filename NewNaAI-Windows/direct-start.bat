@echo off
echo NewNa.AI Direct Electron Start
echo ==============================
echo.

REM Direct Electron start without npm
if exist "node_modules\.bin\electron.cmd" (
    echo Starting Electron directly...
    node_modules\.bin\electron.cmd .
) else if exist "node_modules\electron\dist\electron.exe" (
    echo Starting Electron from dist...
    node_modules\electron\dist\electron.exe .
) else (
    echo ERROR: Electron not found in node_modules!
    echo Please run 'npm install' first.
    echo.
    pause
)