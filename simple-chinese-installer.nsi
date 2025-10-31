; Note Revive 中文安装脚本 - 简洁版
; 作者: 郝好先生 hhhh124hhhh@qq.com

!define APPNAME "Note Revive"
!define VERSION "1.0.0"
!define PUBLISHER "郝好先生"
!define EMAIL "hhhh124hhhh@qq.com"
!define DESCRIPTION "智能便签管理应用"
!define CHINESE_DESC "智能便签管理应用 - 便捷记录您的想法"

; Unicode 支持
Unicode true

; 包含现代UI库
!include "MUI2.nsh"

; 基本设置
Name "${APPNAME}"
OutFile "${APPNAME}-Setup-Chinese-${VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APPNAME}"
InstallDirRegKey HKCU "Software\${APPNAME}" "InstallPath"

; 启用压缩
SetCompressor lzma

; 版本信息
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileDescription" "${CHINESE_DESC}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "© 2025 ${PUBLISHER} ${EMAIL}"

; 现代UI设置
!define MUI_ABORTWARNING

; 现代UI页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "chinese-license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; 语言支持
!insertmacro MUI_LANGUAGE "SimpChinese"

; 主程序安装
Section "主程序" SecMain
    SectionIn RO
    
    SetOutPath "$INSTDIR"
    
    ; 复制主程序文件
    File "dist-portable\Note Revive.exe"
    File "dist-portable\README.md"
    
    ; 创建数据目录
    CreateDirectory "$APPDATA\${APPNAME}"
    
    ; 创建卸载程序
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; 创建开始菜单快捷方式
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\Note Revive.exe" "" "$INSTDIR\Note Revive.exe" 0 SW_SHOWNORMAL "" "${CHINESE_DESC}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\卸载 ${APPNAME}.lnk" "$INSTDIR\Uninstall.exe"
    
    ; 创建桌面快捷方式
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\Note Revive.exe" "" "$INSTDIR\Note Revive.exe" 0 SW_SHOWNORMAL "" "${CHINESE_DESC}"
    
    ; 写入注册表（中文名称）
    WriteRegStr HKCU "Software\${APPNAME}" "InstallPath" "$INSTDIR"
    WriteRegStr HKCU "Software\${APPNAME}" "Version" "${VERSION}"
    WriteRegStr HKCU "Software\${APPNAME}" "DataPath" "$APPDATA\${APPNAME}"
    
    ; 添加到"应用和功能"（显示中文名称）
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME} - ${DESCRIPTION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\Note Revive.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "mailto:${EMAIL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Comments" "${CHINESE_DESC}"
    
SectionEnd

; 卸载程序
Section "Uninstall"
    
    ; 删除程序文件
    Delete "$INSTDIR\Note Revive.exe"
    Delete "$INSTDIR\README.md"
    Delete "$INSTDIR\Uninstall.exe"
    
    ; 删除快捷方式
    Delete "$DESKTOP\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\卸载 ${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\${APPNAME}"
    
    ; 删除注册表项
    DeleteRegKey HKCU "Software\${APPNAME}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
    
    ; 删除安装目录
    RMDir "$INSTDIR"
    
SectionEnd

; 初始化时显示中文欢迎信息
Function .onInit
    !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd