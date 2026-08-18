# said-wat

> macOS 菜单栏 AI 助手：快捷键截屏解析 + 英文起草工作区 —— 由 Kimi（Moonshot）驱动。

said-wat 常驻菜单栏，平时隐形，按快捷键才出现。它解决两个日常痛点——给在英文聊天中工作的人：

1. **看懂长英文消息** — 按 `Cmd+Shift+S`，框选消息（微信桌面版截图手感），弹出便签：全文翻译、一句话总结、值得注意的点（潜台词、歧义、需要回复的内容）。
2. **写出可靠的英文回复** — 在同一个便签里，用英文起草（快捷键润色）或直接说中文意图（AI 判断你有没有答到点上、翻译成英文，漏了什么会警告你）。

## 功能

- **托盘常驻** — 单实例，启动无窗口；从托盘退出。
- **全局快捷键** — `Cmd+Shift+S` 截图 / `Cmd+Shift+E` 剪贴板润色；可在设置里改键。
- **微信式截图** — 屏幕变暗 → 拖拽框选 → ✓/Enter/双击确认，Esc 取消；支持多显示器。
- **三段式便签** — 全文翻译 / 一句话总结 / 值得注意的点，每段可复制。
- **交互式润色（Flow A）** — 鼠标选中文本（或复制到剪贴板）→ `Cmd+Shift+E` → 地道版本，然后可以继续提意见：「语气太生硬」「说得更细一点」，它会按意见重写，每一版都可复制。
- **判定式回复（Flow B）** — 中文意图 → 判定过的英文回复，漏答会有警告；多轮线程记忆（上限 20 条）。
- **设置窗口** — 热键改键、模型选择、测试连接、API key 状态。
- **隐私** — API key 只存在于你的环境（`.env`），绝不进仓库；除了内存里的便签线程，不记录、不落盘任何内容。

## 环境要求

- macOS（目前仅支持该平台）
- Node.js 20+ 与 pnpm

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置 API key（Moonshot / Kimi）
cp .env.example .env
# 编辑 .env，填入 MOONSHOT_API_KEY

# 3. 运行
pnpm start
```

首次启动需要屏幕录制权限（截图功能必需）——缺失时 said-wat 会自动打开系统设置引导开启。

## 使用

| 快捷键 | 功能 |
| --- | --- |
| `Cmd+Shift+S` | 框选屏幕区域 → 翻译 / 总结 / 要点 |
| `Cmd+Shift+E` | 润色鼠标选中的文字（无选中时用剪贴板；可多轮交互） |

便签内：`Enter` 发送，`Shift+Enter` 换行。每个文本块都有复制按钮。

## 配置

- **API key** — `.env` 中的 `MOONSHOT_API_KEY`（或 shell 环境变量）。调用时实时读取，之后设置也无需重启。
- **模型** — 默认 `kimi-k2.6`（非思考模式，省钱）；设置里可选 `kimi-k2.7-code`。`SAIDWAT_MODEL` 是仅供开发的覆盖变量。
- **热键** — 在设置中改键（托盘 → Settings…）；`Cmd+W` / `Cmd+Q` 保留给系统。
- 设置保存在 `~/Library/Application Support/said-wat/settings.json`。

## 开发

```bash
pnpm build   # rspack 打包 renderer + tsc 打包 main
pnpm lint    # oxlint + eslint
pnpm type    # tsc --noEmit
pnpm test    # vitest
```

无需屏幕录制权限的演示模式：`SAIDWAT_DEMO=1 pnpm start`，会用内置示例截图跑完整流程。

## 技术栈

Electron 35 · TypeScript（strict，ESM）· React 19 · rspack · vitest · OpenAI 兼容的 Kimi API（`api.moonshot.cn`）

## 项目结构

- `workspace/app/src/main/` — 托盘、热键、截图遮罩、LLM 客户端、流程、IPC
- `workspace/app/src/renderer/` — 便签弹窗、截图遮罩、设置
- `workspace/app/src/shared/` — 共享类型

## 路线图

- 多模型支持（OpenAI / DeepSeek / Qwen / GLM 等）与应用内 API key 填写 —— 已记录为 Story 10。
