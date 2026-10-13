@echo off
rem Starts Jigsaw in its own window. Rescans the videos folder first.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\scan-videos.ps1" >nul

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE%" (
  start "" "%EDGE%" --app="file:///%~dp0index.html" --window-size=1400,900
) else (
  start "" "%~dp0index.html"
)
