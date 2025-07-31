@echo off
title NewNa.AI Windows App
color 0A
cls

echo ===================================
echo     NewNa.AI Windows App Launcher
echo ===================================
echo.

:: This will keep the window open no matter what
cmd /k npm start

:: If we reach here, something went wrong
echo.
echo If you see this message, npm start failed.
echo Press any key to exit...
pause >nul