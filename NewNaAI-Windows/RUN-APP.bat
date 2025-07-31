@echo off
:: This opens a new command window that stays open
start cmd /k "cd /d %~dp0 && echo Starting NewNa.AI... && npm start"