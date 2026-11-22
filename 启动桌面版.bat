@echo off
chcp 65001 >nul
echo ============================================
echo   StudyHub Windows 桌面客户端 启动脚本
echo   （纯本地 Electron 桌面软件，不启动 localhost）
echo ============================================
echo.

if not exist node_modules (
  echo [1/3] 首次运行，正在安装基础依赖...
  call npm install
)

if not exist node_modules\electron (
  echo [2/3] 正在安装 Windows 桌面引擎 Electron（仅首次需要）...
  call npm install -D electron electron-builder
)

echo [3/3] 正在构建并启动 StudyHub 桌面窗口...
call npm run electron:start
pause
