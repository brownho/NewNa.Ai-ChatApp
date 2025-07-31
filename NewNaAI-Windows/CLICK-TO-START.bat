@echo off
:: This batch file will NOT close automatically

echo NewNa.AI Windows App
echo ====================
echo.

:: Make sure we're in the right directory
cd /d "%~dp0"

:: Check if package.json exists
if not exist "package.json" (
    echo ERROR: This batch file must be run from the NewNaAI-Windows folder!
    echo.
    echo Current folder: %cd%
    echo.
    echo Please make sure you extracted all files and are running this
    echo from the NewNaAI-Windows folder.
    echo.
    goto :end
)

:: Try to run npm start
echo Starting app...
echo.
npm start

:: If we get here, npm start finished or failed
echo.
echo ====================================
echo The app has stopped or failed to start.
echo Check the messages above for errors.
echo ====================================

:end
echo.
echo Press any key to close this window...
pause >nul