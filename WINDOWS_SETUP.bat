@echo off
echo NewNa.AI Windows App Setup
echo ==========================
echo.

cd /d C:\
if exist "NewNaAI-Windows.zip" (
    echo Extracting files...
    powershell -command "Expand-Archive -Path 'NewNaAI-Windows.zip' -DestinationPath 'C:\' -Force"
    
    cd NewNaAI-Windows
    echo.
    echo Installing dependencies...
    call npm install
    
    echo.
    echo Installation complete!
    echo.
    echo To start the app, run: npm start
    echo Or double-click quick-start.bat
    pause
) else (
    echo ERROR: NewNaAI-Windows.zip not found in C:\
    echo Please download it first from http://192.168.4.105:8888/NewNaAI-Windows.zip
    pause
)