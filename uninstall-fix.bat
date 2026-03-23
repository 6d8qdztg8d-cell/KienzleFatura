@echo off
echo KienzleFaktura - Cleanup Tool
echo ================================

:: App beenden falls sie läuft
taskkill /F /IM KienzleFaktura.exe 2>nul

:: Alle möglichen Installationsordner löschen
rmdir /s /q "C:\Program Files\KienzleFaktura" 2>nul
rmdir /s /q "C:\Program Files\KienzleFaktura 1.0.0" 2>nul
rmdir /s /q "C:\Program Files (x86)\KienzleFaktura" 2>nul
rmdir /s /q "C:\Program Files (x86)\KienzleFaktura 1.0.0" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Programs\KienzleFaktura" 2>nul

:: Registry-Einträge löschen
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFaktura" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFaktura" /f 2>nul

echo.
echo Fertig! Jetzt kannst du die neue Version installieren.
pause
