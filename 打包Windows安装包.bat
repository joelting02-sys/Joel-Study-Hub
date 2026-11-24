@echo off
chcp 65001 >nul
echo ============================================
echo   StudyHub Windows 安装包 (.exe) 打包脚本
echo   （Tauri v2 + Rust 原生内核）
echo ============================================
echo.

if not exist node_modules (
  echo [1/2] 正在安装前端依赖...
  call npm install
)

echo [2/2] 正在编译 Rust 内核并打包 Windows NSIS 安装包，请稍候...
call npm run tauri:build

echo.
echo 打包完成！请在 src-tauri\target\release\bundle\nsis\ 中找到安装程序，或在 src-tauri\target\release\studyhub.exe 获取单文件便携版。
pause
