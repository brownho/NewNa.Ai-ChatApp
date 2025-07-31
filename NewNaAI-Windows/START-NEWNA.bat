@echo off
:: This uses PowerShell to ensure the window stays open
powershell -NoExit -Command "Write-Host 'NewNa.AI Windows App' -ForegroundColor Cyan; Write-Host '==================' -ForegroundColor Cyan; Write-Host ''; Set-Location '%~dp0'; npm start"