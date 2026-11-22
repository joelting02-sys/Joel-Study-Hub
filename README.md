<div align="center">

# StudyHub

**本地优先的 Windows 英语与专业课学习桌面客户端 · 专为 AI Agent 文件协作设计**

![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-Pure%20IPC%20(No%20Localhost)-47848F?logo=electron&logoColor=white)
![Storage](https://img.shields.io/badge/Storage-Local%20JSON%20%2B%20Markdown-2563EB)
![License](https://img.shields.io/badge/License-MIT-16A34A)

[下载 Windows (.exe)](#-下载安装windows-exe) · [给 AI Agent 的接入文档](./AGENT_GUIDE.md) · [数据目录协议](#-数据目录结构与-agent-权限) · [发布新版本 Release](#-如何在-github-自动打包并发布-exe-到-releases)

</div>

---

## ✨ 核心特性

- **纯原生 Windows 桌面客户端**：基于 Electron 原生 IPC + 离线文件加载（`BrowserWindow.loadFile`），**不启动 localhost、不占用端口、无需浏览器、无需登录、无云数据库**。
- **零预设示例，直接交给 Agent 使用**：启动后自动在数据根目录生成 [`AGENT_GUIDE.md`](./AGENT_GUIDE.md)，并在「设置」提供一键复制 Agent 接入指令；AI Agent 只需读写本地 JSON 文件即可出题、推词、读取成绩。
- **全局点词翻译（4 级优先级）**：测验 `glossary` 整组最长匹配优先 → 专有大写缩写（`IS` / `IT`） → 离线词典 ECDICT（含 `exchange` 词形还原，支持放入完整 `ecdict.csv`） → 手动录入中文。
- **测验模式防误触交互**：点击选项内英文单词仅查词翻译，绝不触发作答；作答仅响应字母按钮 `A/B/C/D`、选项空白处或键盘 `1–4`；交卷自动写出 `results/<quiz_id>_<时间>.json`。
- **单词库与间隔复习**：`学习中` / `已学会` 独立分页、重复点词自动累加 `lookup_count`、`1 → 3 → 7 → 14` 天间隔复习、每次变更原子写入 `vocab.json` 并自动同步导出 `exports/单词库.md`（适配 Obsidian / Anki）。
- **实时文件监听与原子写入**：通过 `chokidar` 实时监听 `quizzes/`、`vocab_inbox/` 与 `dict/`，所有写操作均先写 `.tmp.` 临时文件再 `rename`，防止数据损坏。

---

## 📦 下载安装（Windows `.exe`）

直接前往本仓库右侧的 **[Releases](../../releases/latest)** 页面下载最新编译好的 Windows 客户端（无需安装 Node.js）：

| 文件名 | 说明 |
| --- | --- |
| **`StudyHub-Setup-<version>.exe`** | **推荐** · 标准 Windows 安装程序，可自定义安装目录并自动创建桌面快捷方式 |
| **`StudyHub-Portable-<version>.exe`** | 免安装便携版，下载后双击即可运行 |

> 首次打开如遇 Windows SmartScreen 提示（开源软件未购买商业代码签名证书），点击 **「更多信息」→「仍要运行」** 即可。

---

## 🤖 给 AI Agent 使用（即插即用）

> **如果你是 AI Agent，请直接阅读 [`AGENT_GUIDE.md`](./AGENT_GUIDE.md)**（StudyHub 启动后也会在数据目录自动生成一份完全一致的 `AGENT_GUIDE.md`）。

使用流程：
1. 打开 **StudyHub** 桌面客户端，进入左侧 **「设置」**。
2. 点击 **「复制给 Agent 的接入指令」**，发送给你的 AI Agent（如 Claude Code / Codex / Cursor / OpenClaw 等）。
3. Agent 读完 `AGENT_GUIDE.md` 后即可直接往 `quizzes/` 写测验、往 `vocab_inbox/` 推生词、从 `results/` 和 `vocab.json` 分析你的薄弱点。

---

## 📁 数据目录结构与 Agent 权限

Windows 默认路径：`C:\Users\<用户名>\Documents\StudyHub\`（可在客户端「设置」中点击「浏览文件夹」更改）：

```text
StudyHub/
├── AGENT_GUIDE.md          ← 自动生成的 Agent 完整协议手册
├── vocab.json              ← 单词库（软件唯一写入者，Agent 只读）
├── vocab_inbox/            ← Agent 写入 *.json，软件自动去重合并并删除原文件
├── quizzes/                ← Agent 写入 *.json 测验，软件实时监听自动刷新
├── results/                ← 每次交卷自动写出 <quiz_id>_<时间>.json（Agent 只读）
├── dict/                   ← 离线词典目录（可放入 skywind3000/ECDICT 的 ecdict.csv）
└── exports/单词库.md        ← 自动导出的 Markdown 表格（给 Obsidian / Anki 使用）
```

---

## 🚀 如何在 GitHub 自动打包并发布 `.exe` 到 Releases

本仓库已内置 GitHub Actions 自动化发布流水线 [`.github/workflows/release-windows.yml`](./.github/workflows/release-windows.yml)，无需本地环境即可在云端自动打包 Windows `.exe` 并发布到 **Releases** 页面：

### 方式 1：在 GitHub 网页一键触发（最简单，零命令行）
1. 打开 GitHub 仓库顶部菜单 **Actions** → 左侧选择 **Release Windows (.exe)**。
2. 点击右上角 **Run workflow**，输入版本号标签（例如 `v1.0.0`）并点击运行。
3. 等待约 2–3 分钟构建完成后，打开仓库右侧 **Releases** 页面即可看到并下载 `StudyHub-Setup-1.0.0.exe` 与 `StudyHub-Portable-1.0.0.exe`。

### 方式 2：推送 Git Tag 自动发布
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions 会自动运行类型检查、单元测试、打包 Windows 安装版与便携版 `.exe`，并创建对应版本的 Release。

---

## 🛠️ 从源码本地运行 / 构建

需要 [Node.js 20+](https://nodejs.org/)：

```powershell
# 1. 安装依赖（含 Electron 与打包工具）
npm install
npm install --no-save electron electron-builder

# 2. 启动原生 Windows 桌面客户端（零 localhost）
npm run electron:start

# 3. 本地打包 Windows .exe 到 release/ 目录
npm run electron:pack

# 4. 运行类型检查与全部测试
npm run lint
npm test
```

Windows 下也可直接双击仓库根目录的 **`启动桌面版.bat`** 或 **`打包Windows安装包.bat`**。

---

## 📄 License

[MIT](./LICENSE)
