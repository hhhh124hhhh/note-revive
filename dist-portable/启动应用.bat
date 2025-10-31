@echo off
title Note Revive - 智能便签管理
echo.
echo ========================================
echo    Note Revive - 智能便签管理
echo    作者: 郝好先生
echo    邮箱: hhhh124hhhh@qq.com
echo ========================================
echo.
echo 正在启动应用...
echo.

REM 检查exe文件是否存在
if not exist "Note Revive.exe" (
    echo 错误: 找不到主程序文件 "Note Revive.exe"
    echo 请确保所有文件都在同一目录下
    pause
    exit /b 1
)

REM 启动应用
start "" "Note Revive.exe"

echo 应用已启动！
echo 如需技术支持，请联系: hhhh124hhhh@qq.com
echo.
timeout /t 3 /nobreak >nul
exit