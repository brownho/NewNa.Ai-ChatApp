@echo off
echo TEST BATCH FILE
echo ==============
echo.
echo Testing basic commands...
echo.

echo Current directory:
cd
echo.

echo Checking if we're in the right folder:
if exist package.json (
    echo Found package.json - Good!
) else (
    echo ERROR: package.json not found
    echo This batch file must be in the NewNaAI-Windows folder
)
echo.

echo Checking Node.js:
node --version
if errorlevel 1 (
    echo ERROR: Node.js not installed
) else (
    echo Node.js is installed
)
echo.

echo Checking npm:
npm --version
if errorlevel 1 (
    echo ERROR: npm not found
) else (
    echo npm is installed
)
echo.

echo Listing files in current directory:
dir /b *.json
echo.

echo Checking if node_modules exists:
if exist node_modules (
    echo node_modules folder exists
) else (
    echo node_modules folder NOT found - need to run npm install
)
echo.

echo Press Enter to try running npm start...
pause

echo.
echo Running: npm start
npm start

echo.
echo ========================================
echo If you see this, npm start has finished.
echo ========================================
echo.
echo Press Enter to exit...
pause