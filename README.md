<div align="center">

# ✨ NovelWritingAgent

**本地优先 · AI 驱动的小说创作工作台**
**A local-first, AI-powered novel-writing studio**

[Tauri 2](https://tauri.app) · [Vue 3](https://vuejs.org) · [TypeScript](https://www.typescriptlang.org) · [Pinia](https://pinia.vuejs.org)

[![license](https://img.shields.io/badge/license-MIT-green.svg)](#-license)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue.svg)](#)
[![status](https://img.shields.io/badge/status-active-brightgreen.svg)](#)
[![stars](https://img.shields.io/github/stars/NovelWritingAgent/NovelWritingAgent?style=social)](#)

把灵感变成完整作品 —— 从一句话构思到章节成稿，七个环节层层推进，每一稿都可回溯、可调整、可确认。
Turn a spark of an idea into a finished work — from a one-line premise to polished chapters, guided by a seven-stage pipeline where every draft is reversible, adjustable, and confirmable.

</div>

---

## 📖 这是什么 · What is this

**NovelWritingAgent** 是一款跨平台桌面应用。它把"AI 写作"从一次性提示词游戏，升级成一套有结构、有依赖、有版本感的创作流程：内置七大环节智能体协同工作，自动串联上下游设定，流式输出、对话式改稿、快照回滚一应俱全 —— 而所有数据与密钥**只留在你自己的电脑里**。

**NovelWritingAgent** is a cross-platform desktop app that turns "AI writing" from a one-shot prompt game into a structured, dependency-aware, version-controlled creative flow. Seven built-in stage agents work together, automatically wiring up settings from earlier steps, with streaming output, conversational editing, and snapshot rollback — while all your data and API keys **stay on your own machine**.

---

## 🌟 核心功能 · Features

### 🪜 七环节创作流水线 · Seven-Stage Pipeline
按专业创作方法论拆解，逐级推进、层层依赖：
1. 💡 构思 · Premise
2. 🌍 世界观架构 · World-building
3. 👤 人物构造 · Characters
4. 📈 人物发展 · Character Arcs
5. ⚡ 重要事件 · Key Events
6. 🗂️ 章节大纲 · Chapter Outline
7. 📝 章节正文 · Chapter Draft（单章 2000–3500 字）

上下文组装器会按你勾选的上游设定自动拼接内容，并标注"已确认 / 草稿"，让 AI 永远基于最新、最准确的设定进行创作。
The context assembler stitches together the upstream settings you select, tagged as *Confirmed* / *Draft*, so the model always writes from the freshest, most accurate canon.

### 🎛️ 逐环节可调 · Per-stage Control
每个环节独立绑定模型、温度与系统提示词，一键恢复默认。把"灵感发散"调高，把"成稿打磨"调稳。
Bind a distinct model, temperature, and system prompt per stage. Crank it up for ideation, dial it down for polishing.

### 🔄 流式生成 + 对话式改稿 · Streaming & Conversational Editing
- 增量流式输出，边生成边阅读，可随时**中途取消**。
- 改稿不用重跑：用自然语言下达指令 → 流式预览 → 一键**应用 / 放弃**。
- Incremental streaming you can read as it lands, cancelable anytime.
- Refine without regenerating: issue a natural-language instruction → preview it streaming → **apply or discard**.

### 🗃️ 版本快照与回滚 · Version Snapshots
每一环节保留最多 20 条历史快照，对比、回滚一步到位，再也不怕 AI 把好稿子覆盖掉。
Up to 20 snapshots per stage — compare and roll back in one click, so a regenerations never buries your best draft.

### 🔌 多服务商接入 · Bring Your Own Model
OpenAI 兼容协议统一接入，内置预设一键填充、连接测试、自动拉取模型列表：
**DeepSeek · Kimi(月之暗面) · 通义千问 · 智谱 GLM · OpenAI · Ollama(本地) · 自定义**
Unified OpenAI-compatible access with one-click presets, connection testing, and automatic model listing.

### 🔒 本地优先 · Privacy First
项目与设置以原子化 JSON 落盘，API Key 仅存本机；LLM 请求经 Rust 侧发出（规避 CORS 且不经第三方）。你的故事，只属于你。
Projects and settings persist as atomic JSON on disk; API keys never leave your device; LLM calls go out from the Rust layer (bypassing CORS, never through a third party). Your story stays yours.

### 🎨 精致桌面体验 · Polished Desktop UX
Markdown 编辑/预览双模式、明暗主题跟随系统、macOS Overlay 沉浸式标题栏、自动保存与进度统计。
Markdown edit/preview modes, system-aware light/dark theme, immersive macOS overlay title bar, autosave, and progress tracking.

---

## 🧱 技术栈 · Tech Stack

| 层 · Layer | 选型 · Choice |
| :--- | :--- |
| 桌面壳 · Desktop shell | Tauri 2 (Rust) |
| 前端 · Frontend | Vue 3 + TypeScript + Vite |
| 状态 · State | Pinia |
| 路由 · Routing | Vue Router |
| 图标 · Icons | lucide-vue-next |
| 渲染 · Rendering | markdown-it |
| 网络 · Networking | reqwest (Rust, streaming) |

---

## 🚀 快速开始 · Getting Started

### 环境依赖 · Prerequisites
- [Node.js](https://nodejs.org) 18+ 与 [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs) 工具链
- [Tauri 2 系统依赖](https://tauri.app/start/prerequisites/)

```bash
# 安装依赖 · install
pnpm install

# 开发模式（热重载） · dev with hot reload
pnpm tauri dev

# 构建安装包 · build distributable installers
pnpm tauri build
```

> 纯 Web 预览（不含桌面能力）：`pnpm dev` / Pure web preview: `pnpm dev`

---

## 🗺️ 路线图 · Roadmap

- [ ] 一键导出 TXT / EPUB · One-click TXT / EPUB export
- [ ] 多智能体协作与角色一致性校验 · Multi-agent collaboration & character-consistency checks
- [ ] 灵感卡片与素材库 · Inspiration cards & asset library
- [ ] 插件化的提示词市场 · Pluggable prompt marketplace

---

## 🤝 参与贡献 · Contributing

欢迎 Issue 与 Pull Request —— fork、建分支、提交，然后把它带回来。
Issues and pull requests are welcome — fork, branch, commit, and bring it back.

---

## 📜 License

本项目基于 [MIT](./LICENSE) 协议开源。
This project is open-sourced under the [MIT](./LICENSE) license.

---

<div align="center">

**如果它帮到了你的创作，给一个 ⭐ 是最好的支持。**
**If it helps your writing, a ⭐ is the best kind of support.**

</div>
