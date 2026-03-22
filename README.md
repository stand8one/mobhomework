# 📚 小学生作业成长助手

> 让孩子看见自己的进度、不断攻克题目，逐渐建立「我能行」的自信。

## 系统架构

```
mobhomework/
├── functions/          # Cloud Functions (TypeScript)
│   └── src/
│       ├── index.ts                 # 入口，注册 Firestore 触发器
│       ├── onPageCreated.ts         # 作业页解析 → Gemini 识别题目
│       ├── onCaptureCreated.ts      # 进度采集分析 → 计划对比 → 通知
│       ├── notifications.ts         # FCM 推送
│       └── gemini/
│           ├── client.ts            # Gemini API 封装
│           └── prompts.ts           # Prompt 模板
│
├── android/            # Android App (Kotlin + Jetpack Compose)
│   └── src/main/java/.../
│       ├── model/Models.kt          # 数据模型
│       └── service/ImageQualityChecker.kt  # 端侧图像质量检测
│
├── web/                # Web App (Next.js + React)
│   └── src/
│       ├── app/                     # 页面
│       ├── components/              # 组件（进度条、状态横幅）
│       ├── hooks/                   # 实时数据 Hook
│       └── lib/                     # Firebase 初始化
│
├── firestore.rules     # Firestore 安全规则
├── storage.rules       # Cloud Storage 安全规则
├── firebase.json       # Firebase 项目配置
└── technical_design.md # 技术架构设计文档
```

## 三端组件

| 组件 | 技术栈 | 核心职责 |
|------|--------|----------|
| **Android App** | Kotlin + Jetpack Compose + CameraX | 作业拍照、双模式采集（照片+视频）、番茄钟、进度条 |
| **Cloud Functions** | TypeScript + Gemini 2.0 Flash | 题目解析、进度分析、计划对比、异常检测、推送通知 |
| **Web App** | Next.js + React + Recharts | 家长省心看板、作业报告、设置管理 |

## 快速开始

### Cloud Functions
```bash
cd functions && npm install
npm run build
# 本地测试
firebase emulators:start
```

### Web App
```bash
cd web && npm install
npm run dev
```

### Android App
在 Android Studio 中打开 `android/` 目录，详见 [android/README.md](android/README.md)

## 核心产品创新点 (v0.3)

1. **AI 多模态拆题引擎 (Gemini 2.5 Flash)**
   - 抛弃传统的全局倒计时模式。拍照录入试卷后，由大模型自动将其拆解为独立的小题，并估算出准确时间。
   - 提供**「人工微调与确认页」**，作为AI偶发失误时的最终兜底（L2+L4兼容设计）。

2. **双轨时间竞速条 (Progress Race Bar)**
   - 将“番茄工作法”游戏化。
   - **实际进度车**：由打卡动作驱动（你完成了几题）。
   - **计划进度车**：由**客观流逝时间**驱动（时间过了一半，车就开完一半）。形成孩子主观努力与时间客观流逝之间的追赶竞赛。

3. **单题微型番茄流**
   - 不再让孩子去苦熬僵化的 25 分钟倒计时。做完一题，系统自动结算并**重置预估新番茄**，让每一个小块学习都能立刻获得精神奖励。

## 文档

- [📝 产品功能与流程规范 (v0.3 最新)](product_spec.md)
- [🏗️ 技术架构设计](technical_design.md)
- [💬 讨论记录](chat.md)

## 当前开发状态

🟢 **Phase 1: MVP Backbone (已跑通)**
- Firebase 匿名登录、Storage 上传。
- Cloud Functions (`onPageCreated`) 与 Gemini 2.5 Flash 的无缝接合反馈。
- Android UI: `CaptureScreen` 以及 `SessionScreen` 赛车进度条。

🟡 **Phase 2: 人工点选与交互容错 (开发中)**
- [x] Android `ReviewQuestionsSheet`: AI 识别切分出问题后的手动增删改、时间调节。
- [ ] 多页连环拍摄绑入同一 Session 后再启动 AI 触发器。

🔴 **Phase 3: The Ultimate Goal (未动工)**
- 高拍仪静默状态下每隔 3 分钟的自动化巡回 `CameraX` 静默拍照。
- 云端自动 Diff 图像判定某题是否已被攻克并推进进度条。
