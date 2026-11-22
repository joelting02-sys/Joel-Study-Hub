# StudyHub —— Windows 本地桌面学习客户端（专为 AI Agent 协作设计）

纯原生 **Electron + React + TypeScript** Windows 桌面客户端软件：
- **零预设示例数据**：启动后词库与测验均保持干净空白，完全由你和你的 AI Agent 写入真实学习内容。
- **不启动 localhost、不占用任何端口、不需要打开浏览器**：Electron 主进程通过 `BrowserWindow.loadFile('dist/index.html')` 直接离线加载界面，所有读写均走原生 IPC。
- **专为 AI Agent 即插即用设计**：启动后自动在数据根目录生成 **`AGENT_GUIDE.md`**（项目根目录也有一份），明确定义全部目录、读写权限、原子写入规则与 JSON Schema；打开「设置」即可一键复制给 Agent 的接入指令。

---

## 给 AI Agent 的入口

> 如果你是 AI Agent，请直接阅读 **`AGENT_GUIDE.md`**（或数据目录中的 `StudyHub/AGENT_GUIDE.md`），里面包含完整的文件路径、权限边界与 JSON 格式规范。

---

## 在 Windows 上启动（2 步上手）

1. 将本项目代码下载到 Windows 电脑并解压（需已安装 [Node.js 20+](https://nodejs.org/)）。
2. 双击运行：
   - **`启动桌面版.bat`** —— 直接弹出原生 **StudyHub** 桌面窗口。
   - **`打包Windows安装包.bat`** —— 生成独立 Windows 安装程序 `release\StudyHub Setup 1.0.0.exe`。

或使用 PowerShell 命令：
```powershell
npm install
npm install -D electron electron-builder
npm run electron:start
```

---

## 数据文件夹结构（默认 `C:\Users\<用户名>\Documents\StudyHub\`）

```text
StudyHub/
├── AGENT_GUIDE.md          ← 自动生成的 Agent 接入协议（交给 Agent 直接阅读）
├── vocab.json              ← 单词库（软件唯一写入者，Agent 只读）
├── vocab_inbox/            ← Agent 写入 *.json 后自动去重合并并删除原文件
├── quizzes/                ← Agent 写入 *.json 测验，软件实时监听自动刷新
├── results/                ← 交卷自动写出 <quiz_id>_<时间>.json（Agent 只读）
├── dict/                   ← 离线词典（可放入 skywind3000/ECDICT 的 ecdict.csv）
└── exports/单词库.md        ← 每次单词库变化自动导出 Markdown 表格
```
