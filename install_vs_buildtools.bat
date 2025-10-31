@echo off
echo 正在启动Visual Studio Build Tools安装...
echo.
echo 注意：这将安装C++桌面开发工具，大约需要1-2GB的下载空间
echo.

vs_buildtools.exe --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --includeOptional

echo.
echo 安装完成！
echo 请按任意键继续...
pause >nul