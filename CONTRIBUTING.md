# 贡献指南 (Contributing Guide)

感谢你对「小学生作业成长助手」的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境搭建

### 前置要求

- **Node.js** 20+
- **Firebase CLI** (`npm i -g firebase-tools`)
- **Android Studio** (Hedgehog+) — 仅 Android 端开发需要
- **Git** 2.30+

### 快速开始

```bash
# 1. Clone 仓库
git clone https://github.com/stand8one/mobhomework.git
cd mobhomework

# 2. Cloud Functions
cd functions
cp .env.example .env.anti-project-38f8d   # 按你的 Firebase 项目命名
# 编辑 .env 文件，填入你的 API Key
npm install
npm run build
npm test

# 3. Web App
cd ../web
cp .env.example .env.local
# 编辑 .env.local，填入 Firebase 配置
npm install
npm run dev

# 4. Firebase Emulators
cd ..
firebase emulators:start
```

## AI Provider 配置

项目支持三种 AI Provider，通过 `AI_PROVIDER` 环境变量切换：

| Provider | 环境变量 | 默认模型 |
|----------|----------|----------|
| **Gemini** (默认) | `GEMINI_API_KEY` | gemini-2.5-flash |
| **OpenAI** | `OPENAI_API_KEY` | gpt-4o |
| **Claude** | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |

## 代码风格

- **TypeScript** — 严格模式 (`strict: true`)
- **缩进** — 2 空格
- **换行符** — LF
- **文件编码** — UTF-8
- 请使用有意义的变量名和函数名
- 注释用中文即可

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
refactor: 重构（非功能变更）
test: 测试相关
chore: 构建/工具变更
security: 安全相关修复
```

## Pull Request 流程

1. Fork 仓库并创建你的分支 (`git checkout -b feat/amazing-feature`)
2. 确保所有测试通过：
   ```bash
   cd functions && npm test     # 81+ tests
   cd ../web && npx vitest run  # 26+ tests
   ```
3. 确保 TypeScript 编译通过：
   ```bash
   cd functions && npx tsc --noEmit
   ```
4. 提交代码并推送到你的 Fork
5. 创建 Pull Request，描述你的更改

## 项目结构

```
mobhomework/
├── functions/         # Cloud Functions (TypeScript)
│   └── src/
│       ├── ai/        # AI Provider 抽象层（支持 Gemini/OpenAI/Claude）
│       ├── __tests__/ # Jest 测试
│       └── ...        # 业务逻辑
├── web/               # Web App (Next.js)
├── android/           # Android App (Kotlin + Jetpack Compose)
└── ...
```

## 报告问题

通过 [GitHub Issues](https://github.com/stand8one/mobhomework/issues) 报告 Bug 或提出建议。

请包含：
- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（OS、Node 版本等）

## License

本项目采用 [MIT License](LICENSE)。
