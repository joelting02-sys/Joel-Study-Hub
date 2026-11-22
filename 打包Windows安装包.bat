@echo off
chcp 65001 >nul
echo ============================================
echo   StudyHub Windows 安装包 (.exe) 打包脚本
echo ============================================
echo.

if not exist node_modules (
  echo [1/3] 正在安装基础依赖...
  call npm install
)

if not exist node_modules\electron-builder (
  echo [2/3] 正在安装 Electron 打包工具...
  call npm install -D electron electron-builder
)

echo [3/3] 正在打包 Windows .exe 安装程序，请稍候...
call npm run electron:pack

echo.
echo 打包完成！请打开项目目录中的 release\ 文件夹找到 StudyHub-Setup-*.exe（安装版）与 StudyHub-Portable-*.exe（便携版）。
pause
