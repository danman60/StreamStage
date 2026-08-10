@echo off
REM ===========================================================================
REM  START-BOOTH.bat  —  double-click this. It starts the whole booth and then
REM  tells you the address to type into the tablet and the phone.
REM
REM  AUTOMATIC vs MANUAL:
REM    * Automatic already exists — booth-kiosk.bat and booth-presenter.bat are
REM      in the Startup folder and fire AT LOGON. If DART reboots and nobody
REM      logs in, nothing starts. That is not a bug, it is what Startup means.
REM    * This file is the manual one. It is safe to double-click at any time:
REM      it checks what is already listening and only starts what is missing,
REM      so running it twice cannot give you two kiosks fighting over a port.
REM
REM  The address changes on every venue LAN, so this prints the CURRENT one and
REM  nothing anywhere should hardcode it. (2026-08-09: DART moved .13 -> .11.)
REM ===========================================================================
setlocal
title StreamStage — START BOOTH
set PY=C:\Python313\python.exe
set DECKS=C:\Users\User\Desktop\StudioSage-Live-Demo
set KIOSK=C:\Users\User\Desktop\StreamStage-Kiosk\kiosk

echo.
echo   STREAMSTAGE BOOTH
echo   =================
echo.

REM ---- presenter (decks + the facelift reveal) ------------------------------
netstat -an | findstr LISTENING | findstr ":8090" >nul
if %errorlevel%==0 (
  echo   presenter   already running on 8090
) else (
  echo   presenter   starting on 8090...
  start "StreamStage PRESENTER (8090) - leave this window open" cmd /k "cd /d %DECKS% && %PY% -u presenter-server.py"
)

REM ---- kiosk (booth TV + tablet) -------------------------------------------
netstat -an | findstr LISTENING | findstr ":8081" >nul
if %errorlevel%==0 (
  echo   kiosk       already running on 8081
) else (
  if exist "%KIOSK%\serve.py" (
    echo   kiosk       starting on 8081...
REM  NO --no-flush. That flag stops the kiosk sending captured leads, so an email
REM  taken at the booth would sit on this laptop's disk forever and nobody would
REM  know. It was removed from the old launchers on 2026-08-09 for exactly that
REM  reason and came back in this rewrite; the kiosk running today is correct
REM  (started without it), so this line is what would have broken it on the next
REM  restart. Leads go to https://streamstage.live/api/expo-leads.
REM  Only a TEST kiosk should ever use --no-flush.
    start "StreamStage BOOTH KIOSK (8081) - leave this window open" cmd /k "cd /d %KIOSK% && %PY% -u serve.py --port 8081"
  ) else (
    echo   kiosk       NOT FOUND at %KIOSK% - skipping
  )
)

timeout /t 6 /nobreak >nul

echo.
echo   Addresses on THIS network right now:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4" ^| findstr /V "100\."') do (
  for /f "tokens=1" %%b in ("%%a") do (
    echo     TV        http://%%b:8081/tv
    echo     tablet    http://%%b:8081/tablet
    echo     phone     http://%%b:8090/remote
  )
)
echo.
echo   Nothing above needs typing if discovery works — the tablet and the phone
echo   hear the kiosk's beacon on their own. These are the fallback.
echo.
echo   Check everything:  on the linux box run  tests/preflight.sh
echo.
pause
