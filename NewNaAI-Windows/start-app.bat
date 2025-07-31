@echo off
echo Starting NewNa.AI Desktop...
echo.

REM Start with flags to handle certificate and GPU issues
start "" electron . --ignore-certificate-errors --allow-insecure-localhost --disable-gpu --disable-gpu-sandbox --no-sandbox --disable-software-rasterizer

echo.
echo App launched. You can close this window.