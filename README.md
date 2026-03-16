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

## 文档

- [产品规格说明书](product_spec.md)
- [技术架构设计](technical_design.md)
- [讨论记录](chat.md)

## 状态

🟢 Phase 1 完成 — 基础设施已搭建
