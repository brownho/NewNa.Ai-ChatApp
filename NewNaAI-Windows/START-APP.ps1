# NewNa.AI PowerShell Launcher
Write-Host "NewNa.AI Desktop App Launcher" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check if running pre-built version
if (Test-Path "dist\win-unpacked\NewNa.AI.exe") {
    Write-Host "Found pre-built executable!" -ForegroundColor Green
    Write-Host "Starting NewNa.AI.exe..." -ForegroundColor Yellow
    Start-Process "dist\win-unpacked\NewNa.AI.exe"
    Write-Host "App started!" -ForegroundColor Green
    exit
}

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Check if package.json exists
if (!(Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "Make sure you're running this from the NewNaAI-Windows folder" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the app
Write-Host ""
Write-Host "Starting NewNa.AI with npm..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm start