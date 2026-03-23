!macro customInit
  nsExec::Exec 'taskkill /F /IM KienzleFAT.exe'
  Sleep 1000
!macroend

!macro customRemoveFiles
  RMDir /r "$INSTDIR"
!macroend
