@echo off
echo 正在安装Rust工具链...
echo.

REM 方法1: 使用rustup安装
echo 尝试使用rustup安装...
curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
if %ERRORLEVEL% EQU 0 (
    echo Rust安装成功！
    goto :end
)

echo.
echo rustup安装失败，尝试使用winget...
winget install Rustlang.Rust.MSVC
if %ERRORLEVEL% EQU 0 (
    echo Rust安装成功！
    goto :end
)

echo.
echo 自动安装失败，请手动安装：
echo 1. 访问 https://rustup.rs/
echo 2. 下载并运行 rustup-init.exe
echo 3. 或者使用winget: winget install Rustlang.Rust.MSVC
echo.

:end
echo.
echo 安装完成后，请重新打开命令行窗口并运行:
echo npm run tauri:dev
pause