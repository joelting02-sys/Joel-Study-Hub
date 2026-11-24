@echo off
chcp 65001 >nul
echo ============================================
echo   StudyHub Windows 桌面客户端 启动脚本
echo   （Tauri v2 + Rust 原生桌面内核）
echo ============================================
echo.

if not exist node_modules (
  echo [1/2] 首次运行，正在安装前端依赖...
  call npm install
)

echo [2/2] 正在启动 StudyHub Tauri v2 桌面窗口（需已安装 Rust 工具链）...
call npm run tauri:dev
pause
