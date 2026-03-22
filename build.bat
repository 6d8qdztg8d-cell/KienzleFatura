@echo off
echo ====================================
echo  KienzleFaktura - Windows Build
echo ====================================
echo.

echo [1/4] Installing dependencies...
call npm install --ignore-scripts
if errorlevel 1 goto error

echo.
echo [2/4] Rebuilding native modules for Electron...
call npx electron-rebuild -f -w better-sqlite3
if errorlevel 1 goto error

echo.
echo [3/4] Building app bundle...
call npm run build:win
if errorlevel 1 goto error

echo.
echo [4/4] Done!
echo.
echo Installer (.exe) is in the "dist" folder.
echo.
pause
goto end

:error
echo.
echo BUILD FAILED! Check the error above.
pause

:end
