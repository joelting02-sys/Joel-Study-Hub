<div align="center">

# Joel Study Hub

**纯空白本地优先 Windows 桌面学习客户端 · 专为本地 AI Agent 文件协作设计**

![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri%20v2-Rust%20Native%20IPC-FFC131?logo=tauri&logoColor=black)
![Storage](https://img.shields.io/badge/Storage-Local%20JSON%20%2B%20Markdown-2563EB)
![License](https://img.shields.io/badge/License-MIT-16A34A)

[下载 Windows (.exe)](#-下载安装windows-exe) · [给 AI Agent 的接入文档](./AGENT_GUIDE.md) · [数据目录协议](#-数据目录结构与-agent-权限) · [发布新版本 Release](#-如何在-github-自动打包并发布-exe-到-releases)

</div>

---

## ✨ 核心特性

- **Tauri v2 + Rust 超轻桌面内核**：复用 Windows 系统 WebView2，全部文件读写、词典检索、文件监听与更新器由编译型 Rust 驱动，**安装包约 10MB、零 localhost、零端口、无需登录、无云数据库**。
- **彻底空白，零预设资料**：不内置任何预设测验、预设词条、预设文章或固定科目；科目筛选完全按你本地 Agent 写入的真实内容动态生成。启动后在数据目录自动生成 [`AGENT_GUIDE.md`](./AGENT_GUIDE.md) 供 Agent 直接接入。
- **全局点词翻译（4 级优先级）**：测验 `glossary` 整组最长匹配优先 → 专有大写缩写（`IS` / `IT`） → 离线词典 ECDICT（含 `exchange` 词形还原，Rust 高速解析完整 77 万词 `ecdict.csv`） → 手动录入中文。
- **测验模式防误触交互**：点击选项内英文单词仅查词翻译，绝不触发作答；作答仅响应字母按钮 `A/B/C/D`、选项空白处或键盘 `1–4`；交卷自动写出 `results/<quiz_id>_<时间>.json`。
- **单词库与间隔复习**：`学习中` / `已学会` 独立分页、重复点词自动累加 `lookup_count`、`1 → 3 → 7 → 14` 天间隔复习、每次变更原子写入 `vocab.json` 并自动同步导出 `exports/单词库.md`。
- **实时文件监听与原子写入**：通过 Rust `notify` 原生监听 `quizzes/`、`vocab_inbox/` 与 `dict/`，所有写操作均先写 `.tmp.` 临时文件再原子 `rename`，防止数据损坏。

---

## 📦 下载安装（Windows `.exe`）

直接前往本仓库右侧的 **[Releases](../../releases/latest)** 页面下载最新编译好的 Windows 客户端（无需安装 Node.js 或 Rust）：

| 文件名 | 说明 |
| --- | --- |
| **`StudyHub-Setup-<version>.exe`** | **推荐** · 标准 Windows NSIS 安装程序，支持应用内一键直连 GitHub Releases 升级 |
| **`StudyHub-Portable-<version>.exe`** | 免安装单文件便携版，下载后双击即可运行 |
| **`checksums.txt`** | SHA-256 完整性校验清单（供应用内升级自动校验） |

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

本仓库已配置 GitHub Actions 自动化发布流水线 [`.github/workflows/release-windows.yml`](./.github/workflows/release-windows.yml)，支持 **3 种触发方式** 自动在 `windows-latest` 云端编译 Rust/Tauri v2 安装包并上传到 **Releases**：

1. **推送代码到 `main` 自动发布（最省心）**：把代码推送到 `main` 分支后，GitHub Actions 会自动运行前端与 Rust 单元测试、编译 Windows 安装版与便携版、生成 `checksums.txt`，并发布对应 `package.json` 版本号（当前为 `v1.0.1`）的 **Release**。
2. **在 GitHub 网页手动触发**：打开顶部 **Actions → Release Windows (.exe) → Run workflow**，可直接指定 `release_tag`（如 `v1.0.2`）构建发布。
3. **标准 SemVer Tag 发布**：执行 `git tag v1.0.2 && git push origin v1.0.2` 发布新版本 Release。

> ⚠️ 如果 Actions 在发布阶段提示 `403 Resource not accessible by integration`，请进入 GitHub 仓库 **Settings → Actions → General → Workflow permissions**，勾选 **Read and write permissions** 并保存，然后重新运行一次 Workflow 即可。

### 🔄 应用内一键升级（零密钥直连 GitHub Releases + SHA-256 校验）

- 安装版（`StudyHub-Setup-*.exe`）在 GitHub Actions 编译时自动注入仓库信息，**无需配置任何私钥 Secret**。
- 打开客户端 **「设置 → 软件更新」** 点击 **「检查更新」**，Rust 后台直接查询公开仓库的最新 Release；发现更高版本后点击 **「立即下载升级」**，下载完成后自动对照 `checksums.txt` 执行 **SHA-256 完整性校验**，校验通过后点击 **「立即重启并安装」** 启动安装器完成升级，完全保留本地学习数据目录。

---

## 🛠️ 从源码本地运行 / 构建

需要 [Node.js 20+](https://nodejs.org/) 与 [Rust 工具链](https://rustup.rs/)（Windows 10/11 已内置 WebView2）：

```powershell
# 1. 安装前端依赖
npm install

# 2. 启动 Tauri v2 桌面客户端开发模式
npm run tauri:dev

# 3. 本地打包 Windows NSIS 安装包
npm run tauri:build

# 4. 运行类型检查、前端契约测试与 Rust 单元测试
npm run lint
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Windows 下也可直接双击仓库根目录的 **`启动桌面版.bat`** 或 **`打包Windows安装包.bat`**。

---

## 📄 License

[MIT](./LICENSE)
