!macro customInit
  ; App beenden falls sie läuft
  nsExec::Exec 'taskkill /F /IM KienzleFAT.exe'
  nsExec::Exec 'taskkill /F /IM KienzleFaktura.exe'
  Sleep 1000

  ; Alte Registry-Einträge löschen BEVOR Installer alte Version sucht
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFAT"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFAT"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFaktura"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KienzleFaktura"

  ; Alte Installationsordner löschen
  RMDir /r "$PROGRAMFILES64\KienzleFAT"
  RMDir /r "$PROGRAMFILES64\KienzleFaktura"
  RMDir /r "$PROGRAMFILES\KienzleFAT"
  RMDir /r "$PROGRAMFILES\KienzleFaktura"
!macroend

!macro customRemoveFiles
  RMDir /r "$INSTDIR"
!macroend
