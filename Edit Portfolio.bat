@echo off
title Portfolio Editor
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python isn't installed or isn't on PATH.
  echo Get it from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause
  exit /b 1
)
python editor\server.py
if errorlevel 1 pause
