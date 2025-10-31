# Note Revive 手动构建指南

## 📋 当前状况

由于网络环境限制 (GitHub域名被解析到127.0.0.1)，无法自动下载Tauri构建工具。但我们可以通过手动方式完成安装包的构建。

## 🛠️ 已完成的工作

### ✅ 便携版应用
- **文件**: `dist-portable/Note Revive.exe` (5.3MB)
- **状态**: 完全可用，包含图标和详细信息
- **开发者信息**: 已正确配置

### ✅ 开发者信息配置
- **作者**: 郝好先生 hhhh124hhhh@qq.com
- **版权**: © 2025 郝好先生 hhhh124hhhh@qq.com
- **应用描述**: 智能便签管理应用

## 🔧 手动构建安装包的方法

### 方法1: 使用第三方安装包制作工具

#### 使用 Inno Setup (推荐)
1. **下载**: https://jrsoftware.org/isdl.php
2. **安装脚本示例**:
```pascal
[Setup]
AppName=Note Revive
AppVersion=1.0.0
AppPublisher=郝好先生
AppPublisherURL=mailto:hhhh124hhhh@qq.com
DefaultDirName={pf}\Note Revive
DefaultGroupName=Note Revive
OutputDir=installer
OutputBaseFilename=NoteRevive-Setup-1.0.0

[Files]
Source: "dist-portable\Note Revive.exe"; DestDir: "{app}"
Source: "dist-portable\README.md"; DestDir: "{app}"; Flags: isreadme

[Icons]
Name: "{group}\Note Revive"; Filename: "{app}\Note Revive.exe"
Name: "{commondesktop}\Note Revive"; Filename: "{app}\Note Revive.exe"

[Run]
Filename: "{app}\Note Revive.exe"; Description: "启动 Note Revive"; Flags: nowait postinstall skipifsilent
```

#### 使用 Advanced Installer
1. **下载**: https://www.advancedinstaller.com/
2. **优点**: 图形界面，操作简单

### 方法2: 便携版分发优化

#### 创建自解压包
1. **使用工具**: 7-Zip 或 WinRAR
2. **步骤**:
   - 将 `dist-portable/` 目录打包
   - 创建自解压配置
   - 设置解压后自动运行程序

#### PowerShell 安装脚本
```powershell
# install.ps1
Write-Host "正在安装 Note Revive..." -ForegroundColor Green
$installPath = "$env:ProgramFiles\Note Revive"

if (!(Test-Path $installPath)) {
    New-Item -ItemType Directory -Path $installPath -Force
}

Copy-Item "Note Revive.exe" $installPath
Copy-Item "README.md" $installPath

# 创建桌面快捷方式
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "Note Revive.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $installPath "Note Revive.exe"
$shortcut.Save()

Write-Host "安装完成！桌面快捷方式已创建。" -ForegroundColor Green
```

## 🎯 推荐方案

基于当前网络状况，我推荐以下分发方案：

### 1. 便携版 + 安装脚本 (最简单)
- 保持现有的便携版exe
- 提供简单的安装脚本
- 用户可以选择便携使用或安装使用

### 2. 使用 Inno Setup (最专业)
- 下载离线安装包制作工具
- 创建专业的安装程序
- 支持桌面快捷方式和开始菜单

## 📦 分发包建议

```
Note Revive v1.0.0 分发包/
├── portable/                    # 便携版
│   ├── Note Revive.exe
│   ├── README.md
│   └── 启动应用.bat
├── installer/                   # 安装版 (使用Inno Setup制作)
│   └── NoteRevive-Setup-1.0.0.exe
├── scripts/                     # 安装脚本
│   ├── install.ps1
│   └── uninstall.ps1
└── README-INSTALL.md            # 安装说明
```

## 🌐 网络环境修复建议

如需解决网络问题以支持未来的自动构建：

1. **修改DNS设置**:
   ```
   首选DNS: 8.8.8.8
   备用DNS: 8.8.4.4
   ```

2. **使用VPN或代理服务**

3. **联系网络管理员**了解GitHub访问限制

---

**更新时间**: 2025-10-31 13:48
**开发者**: 郝好先生 hhhh124hhhh@qq.com