@echo off
REM ============================================================
REM  BLACK ICE GAMING - CABINET STARTUP SCRIPT
REM  Run this on the Windows 10 IoT cabinet to launch the game.
REM
REM  This script:
REM  1. Starts the hardware bridge (bill acceptor + TITO printer)
REM  2. Starts the jackpot relay (if this is the host machine)
REM  3. Launches Chrome in fullscreen kiosk mode
REM
REM  Place this in the Startup folder for auto-launch:
REM    C:\Users\[user]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
REM ============================================================

REM --- Configuration ---
set GAME_DIR=%~dp0
set GAME_FILE=%GAME_DIR%game.html
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set NODE="C:\Program Files\nodejs\node.exe"

REM --- Kill any existing Chrome instances ---
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM --- Start the hardware bridge (bill acceptor + TITO) ---
REM Uncomment the next line when the bridge service is ready:
REM start /min "Hardware Bridge" %NODE% "%GAME_DIR%hardware-bridge.js"

REM --- Start the jackpot relay (only on the host machine) ---
REM Uncomment the next line if this machine hosts the progressive jackpot:
REM start /min "Jackpot Relay" %NODE% "%GAME_DIR%jackpot-relay.js"

REM --- Wait for services to start ---
timeout /t 2 /nobreak >nul

REM --- Launch Chrome in kiosk mode ---
REM --kiosk: fullscreen with no toolbar, address bar, or close button
REM --disable-translate: no translation popups
REM --disable-infobars: no info bars at top
REM --disable-features=TranslateUI: suppress translate UI
REM --autoplay-policy=no-user-gesture-required: allow auto-play audio
REM --disable-session-crashed-bubble: no "Chrome didn't shut down" warning
REM --noerrdialogs: suppress error dialogs
REM --disable-pinch: prevent pinch-to-zoom on touchscreen
REM --overscroll-history-navigation=0: disable swipe-to-navigate
REM --check-for-update-interval=31536000: disable update checks (1 year)
start "" %CHROME% --kiosk --disable-translate --disable-infobars --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --check-for-update-interval=31536000 "file:///%GAME_FILE%?kiosk"

echo.
echo  =========================================
echo   BLACK ICE GAMING - Cabinet Started
echo   Game: %GAME_FILE%
echo   Press Ctrl+C to stop
echo  =========================================
echo.
