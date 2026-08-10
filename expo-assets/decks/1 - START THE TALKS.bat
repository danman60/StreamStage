@echo off
REM ===========================================================================
REM  1 - START THE TALKS.bat
REM
REM  THIS IS THE ONLY THING YOU NEED TO CLICK to run the talks.
REM  It starts the presenter on 8090 (if it is not already up) and opens BOTH
REM  decks as tabs in Chrome. Everything the decks need is on this disk, so it
REM  works with no internet.
REM
REM  Built 2026-08-10 to replace the pile of launchers that used to be here.
REM  The old ones (REVIEW-DECKS / start-presenter / START-REMOTE / PULL-LATEST)
REM  are in _archive\ if anything ever needs them back.
REM
REM  The booth (kiosk TV + tablet) is a SEPARATE launcher: 2 - START THE BOOTH.bat
REM ===========================================================================
setlocal
title StreamStage - START THE TALKS
set PY=C:\Python313\python.exe
cd /d "%~dp0"

echo.
echo   ==============================================
echo      StreamStage - starting the talks
echo   ==============================================
echo.

REM ---- presenter on 8090 ----------------------------------------------------
netstat -an | findstr LISTENING | findstr ":8090" >nul
if %errorlevel%==0 (
  echo   [ok]   presenter already running on 8090
) else (
  echo   [..]   starting the presenter on 8090...
  start "StreamStage PRESENTER 8090 - LEAVE THIS WINDOW OPEN" cmd /k "cd /d "%~dp0" && "%PY%" -u presenter-server.py"
  timeout /t 5 /nobreak >nul
  echo   [ok]   presenter started
)

REM ---- open both decks in CHROME -------------------------------------------
REM  `start chrome` uses the App Paths registry entry, so it does not matter
REM  which drive Chrome is installed on. If Chrome is somehow missing we fall
REM  back to the default browser rather than opening nothing at all.
echo   [..]   opening the decks in Chrome...
where chrome >nul 2>&1
if %errorlevel%==0 (
  start "" chrome --new-window "http://127.0.0.1:8090/talk2-deck.html"
  timeout /t 2 /nobreak >nul
  start "" chrome "http://127.0.0.1:8090/talk1-deck.html"
) else (
  start "" "http://127.0.0.1:8090/talk2-deck.html"
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8090/talk1-deck.html"
)

echo.
echo   TALK 2  "Why AI"        32 slides    Tue 09:20   ^<- goes first
echo   TALK 1  "Content day"   27 slides    Wed 10:50
echo.
echo   arrows / space = next        number + Enter = jump to a slide
echo   SHIFT+P = presenter notes    (the room can see them - mind the projector)
echo.
echo   PHONE REMOTE
echo     same wifi ...... http://192.168.0.11:8090/remote
echo     any network .... http://100.90.103.121:8090/remote     (Tailscale)
echo.
echo   If the phone cannot see this laptop on venue or hotel wifi, that is
echo   client isolation - put this laptop on your phone hotspot, or use the
echo   Tailscale address above.
echo.
pause
