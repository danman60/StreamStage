@echo off
REM ===========================================================================
REM  REVIEW-DECKS.bat  —  read the decks on the plane. No internet needed.
REM
REM  Double-click. It starts the presenter locally and opens both decks in the
REM  browser. Everything the decks need — fonts, video, images — is on this
REM  disk, so the whole review works at 35,000 feet.
REM
REM  Verified offline 2026-08-09 with the network cut: talk 1 = 27 slides and
REM  talk 2 = 32 slides, every slide, ZERO console errors and ZERO dead media.
REM
REM  The only two things that need internet, and they are supposed to:
REM    * the live-demo embed on talk 2 (press O for the offline animated version)
REM    * the facelift PLANT slide's preview of somebody's current website
REM  Neither blanks a slide. Everything else reads normally.
REM ===========================================================================
setlocal
title StreamStage — DECK REVIEW (offline)
set PY=C:\Python313\python.exe
set DECKS=C:\Users\User\Desktop\StudioSage-Live-Demo

netstat -an | findstr LISTENING | findstr ":8090" >nul
if %errorlevel%==0 (
  echo   presenter already running on 8090
) else (
  echo   starting the presenter on 8090...
  start "StreamStage PRESENTER (8090) - leave this window open" cmd /k "cd /d %DECKS% && %PY% -u presenter-server.py"
  timeout /t 5 /nobreak >nul
)

echo   opening both decks...
start "" http://127.0.0.1:8090/talk2-deck.html
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8090/talk1-deck.html

echo.
echo   talk 2 (AI front desk)  32 slides   ← goes first, Tue 09:20
echo   talk 1 (content day)    27 slides   ← Wed 10:50
echo.
echo   arrows/space = nav   ·   type a number + Enter = jump
echo   SHIFT+P = presenter notes (they are visible to the room, so mind the projector)
echo.
pause
