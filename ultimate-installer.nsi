; Note Revive 终极现代化中文安装脚本
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
OutFile "${APPNAME}-Setup-Ultimate-${VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APPNAME}"
InstallDirRegKey HKCU "Software\${APPNAME}" "InstallPath"

; 启用压缩
SetCompressor /SOLID lzma

; 版本信息
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileDescription" "${CHINESE_DESC}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "© 2025 ${PUBLISHER} ${EMAIL}"

; 现代UI设置 - 自定义图标
!define MUI_ABORTWARNING
!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"

; 现代UI页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "english-license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; 语言支持
!insertmacro MUI_LANGUAGE "SimpChinese"

; 自定义中文界面文本
!define MUI_WELCOMEPAGE_TITLE "欢迎使用 ${APPNAME} 智能便签管理"
!define MUI_WELCOMEPAGE_TEXT "感谢您选择 ${APPNAME}！$\r$\n$\r$\n${DESCRIPTION}，让您的想法井井有条。$\r$\n$\r$\n版本：${VERSION}$\r$\n开发者：${PUBLISHER}$\r$\n技术支持：${EMAIL}$\r$\n$\r$\n点击「下一步」开始安装，祝您使用愉快！"

!define MUI_FINISHPAGE_TITLE "安装完成！"
!define MUI_FINISHPAGE_TEXT "${APPNAME} 已成功安装到您的计算机。$\r$\n$\r$\n现在您可以开始使用这款强大的智能便签管理应用了。$\r$\n$\r$\n如需技术支持，请联系：${EMAIL}$\r$\n$\r$\n祝您使用愉快！"

!define MUI_FINISHPAGE_RUN "启动 ${APPNAME}"
!define MUI_FINISHPAGE_RUN_TEXT "立即运行 ${APPNAME}"
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApplication"

!define MUI_FINISHPAGE_SHOWREADME "查看使用说明"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "阅读 README"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION "ShowReadme"

!define MUI_DIRECTORYPAGE_TEXT_TOP "选择安装位置"
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "请选择 ${APPNAME} 的安装目录："

!define MUI_INSTFILESPAGE_TEXT_TOP "正在安装 ${APPNAME}..."

; 主程序安装
Section "${APPNAME}" SecMain
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

; 自定义函数 - 启动应用
Function LaunchApplication
    ExecShell "" "$INSTDIR\Note Revive.exe"
FunctionEnd

; 自定义函数 - 显示说明
Function ShowReadme
    ExecShell "open" "$INSTDIR\README.md"
FunctionEnd

; 初始化函数
Function .onInit
    !insertmacro MUI_LANGDLL_DISPLAY
    
    ; 检查是否已安装
    ReadRegStr $R0 HKCU "Software\${APPNAME}" "InstallPath"
    StrCmp $R0 "" done
    
    MessageBox MB_YESNO "${APPNAME} 检测到已安装在您的系统中。$\r$\n$\r$\n是否要重新安装？" IDYES done
    Abort
    
    done:
FunctionEnd

; 卸载初始化
Function un.onInit
    !insertmacro MUI_UNGETLANGUAGE
    
    MessageBox MB_YESNO "确定要卸载 ${APPNAME} 吗？$\r$\n$\r$\n您的个人数据将保留在用户目录中不会被删除。" IDYES +2
    Abort
FunctionEnd