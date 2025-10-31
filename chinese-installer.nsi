; Note Revive 中文安装脚本 - 现代化设计
; 作者: 郝好先生 hhhh124hhhh@qq.com

!define APPNAME "Note Revive"
!define VERSION "1.0.0"
!define PUBLISHER "郝好先生"
!define EMAIL "hhhh124hhhh@qq.com"
!define DESCRIPTION "智能便签管理应用"
!define CHINESE_DESC "智能便签管理应用 - 便捷记录您的想法"

; 使用 Unicode 支持
Unicode true

; 包含现代UI库
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "WinCore.nsh"

; 基本设置
Name "${APPNAME}"
OutFile "${APPNAME}-Setup-${VERSION}.exe"
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
!define MUI_ICON "src-tauri\icons\favicon.ico"
!define MUI_UNICON "src-tauri\icons\favicon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "src-tauri\icons\icon.png"
!define MUI_WELCOMEFINISHPAGE_BITMAP "src-tauri\icons\icon.png"

; 现代UI页面 - 中文本地化
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "chinese-license.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; 语言支持
!insertmacro MUI_LANGUAGE "SimpChinese"

; 中文界面文本
LangString DESC_SecMain ${LANG_SIMPCHINESE} "安装 Note Revive 主程序和核心组件"
LangString TITLE_SecMain ${LANG_SIMPCHINESE} "主程序"

LangString WELCOME_TEXT ${LANG_SIMPCHINESE} "欢迎使用 Note Revive 智能便签管理应用！$\r$\n$\r$\n本应用将帮助您高效管理各种笔记和想法。$\r$\n$\r$\n版本：${VERSION}$\r$\n开发者：${PUBLISHER}$\r$\n联系邮箱：${EMAIL}$\r$\n$\r$\n点击「下一步」继续安装。"

LangString FINISH_TEXT ${LANG_SIMPCHINESE} "恭喜！Note Revive 已成功安装到您的计算机上。$\r$\n$\r$\n您现在可以开始使用这款智能便签管理应用了。$\r$\n$\r$\n如果遇到任何问题，请联系开发者：${EMAIL}"

; 安装组件
Section "$(TITLE_SecMain)" SecMain
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
    
    ; 创建桌面快捷方式（可选）
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\Note Revive.exe" "" "$INSTDIR\Note Revive.exe" 0 SW_SHOWNORMAL "" "${CHINESE_DESC}"
    
    ; 写入注册表
    WriteRegStr HKCU "Software\${APPNAME}" "InstallPath" "$INSTDIR"
    WriteRegStr HKCU "Software\${APPNAME}" "Version" "${VERSION}"
    WriteRegStr HKCU "Software\${APPNAME}" "DataPath" "$APPDATA\${APPNAME}"
    
    ; 添加到"应用和功能"（中文名称）
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME} - ${DESCRIPTION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\Note Revive.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "mailto:${EMAIL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Comments" "${CHINESE_DESC}"
    
SectionEnd

; 组件描述
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "$(DESC_SecMain)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; 卸载程序
Section "Uninstall"
    
    ; 确认对话框（中文）
    MessageBox MB_OKCANCEL "确定要卸载 ${APPNAME} 吗？$\r$\n您的个人数据将被保留。" IDCANCEL +2
    
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
    
    ; 删除安装目录（保留数据目录）
    RMDir "$INSTDIR"
    
    MessageBox MB_OK "${APPNAME} 已成功卸载。$\r$\n$\r$\n您的个人数据仍保存在：$\r$\n$APPDATA\${APPNAME}"
    
SectionEnd

; 自定义欢迎页面
Function .onInit
    !insertmacro MUI_LANGDLL_DISPLAY
    
    ; 显示中文欢迎消息
    MessageBox MB_OK "欢迎安装 ${APPNAME} v${VERSION}$\r$\n$\r$\n${CHINESE_DESC}$\r$\n$\r$\n开发者：${PUBLISHER}$\r$\n邮箱：${EMAIL}$\r$\n$\r$\n点击确定开始安装"
FunctionEnd