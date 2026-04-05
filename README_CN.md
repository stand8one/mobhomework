[English](README.md) | **中文**

# 📚 小学生作业成长助手

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-107%20passed-brightgreen.svg)](#测试覆盖)

> 让孩子看见自己的进度、不断攻克题目，逐渐建立「我能行」的自信。

## 系统架构

```
mobhomework/
├── functions/          # Cloud Functions (TypeScript)
│   └── src/
│       ├── index.ts                 # 入口，注册触发器
│       ├── onPageCreated.ts         # 作业页解析 → AI 识别题目
│       ├── onCaptureCreated.ts      # 进度采集分析 → 计划对比 → 通知
│       ├── onSessionCompleted.ts    # 总结报告 + 激励系统
│       ├── logic.ts                 # 纯业务逻辑函数
│       ├── rewards.ts              # 激励机制：积分/成就/个人最佳
│       ├── scheduledCleanup.ts     # 定时清理 Storage
│       ├── notifications.ts        # FCM 推送
│       ├── ai/
│       │   ├── index.ts           # AI Provider 工厂（统一入口）
│       │   ├── types.ts           # AIClient 接口定义
│       │   ├── gemini.ts          # Google Gemini 实现
│       │   ├── openai.ts          # OpenAI (ChatGPT) 实现
│       │   ├── claude.ts          # Anthropic Claude 实现
│       │   └── prompts.ts         # Prompt 模板（含 Diff 检测）
│       └── __tests__/              # 81 个测试用例
│
├── android/            # Android App (Kotlin + Jetpack Compose)
│   └── app/src/main/java/.../
│       ├── model/Models.kt                    # 数据模型
│       ├── service/
│       │   ├── CaptureService.kt              # 核心采集服务（CameraX+TTS+音效）
│       │   ├── CaptureTimer.kt                # 定时采集调度
│       │   ├── ImageQualityChecker.kt         # 端侧图像质量检测
│       │   ├── KeepAliveHelper.kt             # 前台服务保活
│       │   └── HomeworkFCMService.kt          # FCM 推送接收
│       ├── data/local/
│       │   ├── PendingUpload.kt               # Room 离线队列实体
│       │   ├── PendingUploadDao.kt            # Room DAO
│       │   └── AppDatabase.kt                 # Room Database
│       ├── worker/
│       │   └── UploadWorker.kt                # WorkManager 网络恢复补传
│       ├── repository/                        # 数据仓库层
│       ├── viewmodel/                         # MVVM ViewModel
│       ├── ui/screen/                         # Compose 页面
│       └── ui/components/                     # 可复用组件
│
├── web/                # Web App (Next.js + React + Recharts)
│   └── src/
│       ├── app/
│       │   ├── page.tsx                       # 家长看板（含导航栏）
│       │   ├── child/page.tsx                 # 孩子进度页
│       │   ├── report/[sessionId]/page.tsx    # 作业报告详情
│       │   ├── trends/page.tsx                # 效率趋势图
│       │   ├── settings/page.tsx              # 设置管理
│       │   ├── layout.tsx                     # 根布局
│       │   └── providers.tsx                  # AuthProvider 包装
│       ├── components/
│       │   ├── ProgressRaceBar.tsx             # 双轨竞速进度条
│       │   ├── StatusBanner.tsx                # 状态横幅
│       │   ├── EfficiencyChart.tsx             # Recharts 趋势图
│       │   ├── Timeline.tsx                   # 时间线回放
│       │   └── QuestionList.tsx               # 题目列表
│       ├── hooks/
│       │   ├── useAuth.tsx                    # Firebase 匿名认证
│       │   ├── useSession.ts                  # 实时 session 数据
│       │   ├── useReport.ts                   # 报告数据
│       │   └── useHistory.ts                  # 历史趋势数据
│       ├── lib/firebase.ts                    # Firebase 初始化
│       └── __tests__/                         # 26 个测试用例
│
├── firestore.rules     # Firestore 安全规则
├── storage.rules       # Cloud Storage 安全规则
├── firebase.json       # Firebase 项目配置
├── product_spec.md     # 产品功能规格说明书
└── technical_design.md # 技术架构设计文档
```

## 三端组件

| 组件 | 技术栈 | 核心职责 |
|------|--------|----------|
| **Android App** | Kotlin + Jetpack Compose + CameraX + Room | 作业拍照、自动采集、番茄钟、TTS 语音播报、离线缓存 |
| **Cloud Functions** | TypeScript + AI (Gemini / OpenAI / Claude) | 题目解析、进度分析、Diff 判定、激励系统、通知推送、定时清理 |
| **Web App** | Next.js + React + Recharts | 家长看板、孩子进度页、作业报告、效率趋势图、设置管理 |

## 前置要求

- **Node.js** 20+
- **Firebase CLI** — `npm i -g firebase-tools`
- **Android Studio** Hedgehog+ (仅 Android 开发)

## 快速开始

### 1. 环境配置

```bash
# 克隆仓库
git clone https://github.com/stand8one/mobhomework.git
cd mobhomework

# 复制环境变量模板
cp .env.example .env
cp functions/.env.example functions/.env.anti-project-38f8d
cp web/.env.example web/.env.local

# 编辑 .env 文件，填入你的 API Key
```

### 2. AI Provider 配置

项目支持三种 AI Provider，通过 `AI_PROVIDER` 环境变量切换（默认 Gemini）：

| Provider | 环境变量 | 默认模型 | 多模态支持 |
|----------|----------|----------|-----------|
| **Gemini** | `GEMINI_API_KEY` | `gemini-2.5-flash` | ✅ 图片 + 视频 |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` | ✅ 图片 |
| **Claude** | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` | ✅ 图片 |

```env
# functions/.env 示例
AI_PROVIDER=gemini          # 切换为 openai 或 claude
GEMINI_API_KEY=your_key     # 对应 provider 的 key
```

### 3. Cloud Functions

```bash
cd functions && npm install
npm run build
npm test              # 81 tests, 7 suites
firebase emulators:start
```

### 4. Web App

```bash
cd web && npm install
npm run dev
npx vitest run        # 26 tests, 3 suites
```

### 5. Android App

在 Android Studio 中打开 `android/` 目录，详见 [android/README.md](android/README.md)

## 核心产品创新点 (v0.3)

1. **AI 多模态拆题引擎**
   - 抛弃传统的全局倒计时模式。拍照录入试卷后，由 AI 自动将其拆解为独立的小题，并估算出准确时间。
   - 支持 Gemini / ChatGPT / Claude 三种模型，可按需切换。
   - 提供**「人工微调与确认页」**，作为 AI 偶发失误时的最终兜底（L2+L4 兼容设计）。

2. **双轨时间竞速条 (Progress Race Bar)**
   - 将"番茄工作法"游戏化。
   - **实际进度车**：由打卡动作驱动（你完成了几题）。
   - **计划进度车**：由**客观流逝时间**驱动（时间过了一半，车就开完一半）。形成孩子主观努力与时间客观流逝之间的追赶竞赛。

3. **单题微型番茄流**
   - 不再让孩子去苦熬僵化的 25 分钟倒计时。做完一题，系统自动结算并**重置预估新番茄**，让每一个小块学习都能立刻获得精神奖励。

4. **云端 Diff 判定（Phase 3）**
   - 高拍仪定时拍照 → AI 对比原始 boundingBox 区域 → 自动检测笔迹变化 → 无需孩子手动打卡即可推进进度条。

5. **激励机制**
   - 超越计划奖、提前完成奖、连续领先成就、个人最佳记录 — 所有激励基于「和自己的计划比」，避免不健康竞争。

## 文档

- [📝 产品功能与流程规范 (v0.3 最新)](product_spec.md)
- [🏗️ 技术架构设计](technical_design.md)
- [🤝 贡献指南](CONTRIBUTING.md)
- [💬 讨论记录](chat.md)

## 当前开发状态

🟢 **Phase 1: MVP Backbone (已完成)**
- Firebase 匿名登录、Storage 上传。
- Cloud Functions (`onPageCreated`, `onCaptureCreated`, `onSessionCompleted`) 与 AI Provider 的无缝接合。
- Android UI: `CaptureScreen`、`SessionScreen` 赛车进度条、`ReviewQuestionsSheet`。
- Web App: 家长看板、孩子进度页、实时状态、Firebase Auth 集成。

🟢 **Phase 2: 人工点选与交互容错 (已完成)**
- [x] Android `ReviewQuestionsSheet`: AI 识别切分出问题后的手动增删改、时间调节。
- [x] 多页连环拍摄绑入同一 Session。
- [x] Room 离线队列 + WorkManager 网络恢复自动补传。

🟢 **Phase 3: The Ultimate Goal (已完成)**
- [x] 高拍仪静默 CameraX 自动拍照（`CaptureService.performCapture()`）。
- [x] 云端 Diff 判定 Prompt（`buildDiffDetectionPrompt`），boundingBox 级笔迹检测。
- [x] 激励系统：积分/成就/个人最佳（`rewards.ts`）。
- [x] Web 完整功能：报告详情、趋势图、设置管理、时间线回放。
- [x] 定时清理 Storage（`scheduledCleanup`）。
- [x] **多模型支持**：Gemini / OpenAI / Claude Provider 抽象层。

## 测试覆盖

```
Cloud Functions: 81 tests / 7 suites ✅
Web App:         26 tests / 3 suites ✅
总计:            107 tests / 10 suites ✅
```

### Cloud Functions (81 tests)

| 测试套件 | 用例数 | 覆盖范围 |
|----------|--------|----------|
| `onPageCreated` | 15 | AI 题目解析、多页绑定、错误恢复 |
| `onCaptureCreated` | 18 | 进度 Diff 检测、计划对比、家长通知触发条件 |
| `onSessionCompleted` | 5 | 总结报告生成、上下文数据组装、异常处理 |
| `feedbackAndNotifications` | 21 | 计划状态 → 反馈消息映射、FCM 推送条件、边界值 |
| `calculateStars` | 11 | 效率星级（1–5 星）、边界值、除零安全 |
| `rewards` | 8 | 超越计划奖、提前完成奖、连续领先成就、个人最佳 |
| `diffDetection` | 3 | Diff Prompt 生成、boundingBox 包含性、空输入安全 |

### Web App (26 tests)

| 测试套件 | 用例数 | 覆盖范围 |
|----------|--------|----------|
| `useSession` | 7 | 看板状态推导、预期进度计算、边界情况 |
| `progressRaceBar` | 14 | 进度条宽度计算、徽章状态映射、实际 vs 计划对比 |
| `auth` | 5 | 匿名认证状态解析、Loading 优先级、错误传播 |

## License

[MIT](LICENSE) © stand8one
