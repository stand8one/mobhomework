**English** | [中文](README_CN.md)

# 📚 Homework Buddy

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-107%20passed-brightgreen.svg)](#test-coverage)

> Help kids see their progress, conquer problems one by one, and build the confidence of "I can do it!"

An AI-powered homework monitoring system for elementary school students. Parents get real-time dashboards; kids get gamified progress tracking with a racing progress bar.

## Architecture

| Component | Stack | Responsibilities |
|-----------|-------|-----------------|
| **Android App** | Kotlin + Jetpack Compose + CameraX + Room | Photo capture, auto-collection, Pomodoro timer, TTS feedback, offline queue |
| **Cloud Functions** | TypeScript + AI (Gemini / OpenAI / Claude) | Question parsing, progress analysis, diff detection, reward system, push notifications |
| **Web App** | Next.js + React + Recharts | Parent dashboard, child progress view, session reports, efficiency trends |

## Prerequisites

- **Node.js** 20+
- **Firebase CLI** — `npm i -g firebase-tools`
- **Android Studio** Hedgehog+ (Android development only)

## Quick Start

### 1. Environment Setup

```bash
git clone https://github.com/stand8one/mobhomework.git
cd mobhomework

# Copy environment templates
cp .env.example .env
cp functions/.env.example functions/.env.anti-project-38f8d
cp web/.env.example web/.env.local

# Edit .env files with your API keys
```

### 2. AI Provider Configuration

The project supports three AI providers, switchable via the `AI_PROVIDER` environment variable (defaults to Gemini):

| Provider | Env Variable | Default Model | Multimodal |
|----------|-------------|---------------|-----------|
| **Gemini** (default) | `GEMINI_API_KEY` | `gemini-2.5-flash` | ✅ Image + Video |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` | ✅ Image |
| **Claude** | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` | ✅ Image |

```env
# functions/.env example
AI_PROVIDER=gemini          # Switch to openai or claude
GEMINI_API_KEY=your_key     # Key for the selected provider
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

Open the `android/` directory in Android Studio. See [android/README.md](android/README.md) for details.

## Key Innovations (v0.3)

1. **AI Multimodal Question Parsing Engine**
   - Ditch the traditional global countdown. After taking a photo of the worksheet, AI automatically splits it into individual questions with time estimates.
   - Supports Gemini / ChatGPT / Claude — switchable on demand.
   - Includes a **manual review & confirm page** as a safety net for occasional AI mistakes (L2+L4 compatible design).

2. **Dual-Track Progress Race Bar**
   - Gamified Pomodoro technique.
   - **Actual progress car**: driven by check-ins (how many questions completed).
   - **Planned progress car**: driven by **elapsed time** (half time passed = car halfway). Creates a race between subjective effort and objective time.

3. **Per-Question Micro-Pomodoro**
   - No more rigid 25-minute countdowns. Finish one question, auto-settle and **reset** with a fresh estimated Pomodoro. Every small learning block gets instant reward.

4. **Cloud-Based Diff Detection (Phase 3)**
   - Document camera captures periodically → AI compares original boundingBox regions → auto-detects ink changes → no manual check-ins needed to advance the progress bar.

5. **Reward System**
   - Ahead-of-plan bonus, early finish bonus, streak achievements, personal best records — all rewards are based on "competing with your own plan", avoiding unhealthy competition.

## Project Structure

```
mobhomework/
├── functions/          # Cloud Functions (TypeScript)
│   └── src/
│       ├── ai/                      # AI Provider abstraction layer
│       │   ├── index.ts             # Factory & unified entry point
│       │   ├── types.ts             # AIClient interface
│       │   ├── gemini.ts            # Google Gemini implementation
│       │   ├── openai.ts            # OpenAI (ChatGPT) implementation
│       │   ├── claude.ts            # Anthropic Claude implementation
│       │   └── prompts.ts           # Prompt templates
│       ├── __tests__/               # 81 test cases
│       └── ...                      # Business logic & triggers
├── web/                # Web App (Next.js + React + Recharts)
├── android/            # Android App (Kotlin + Jetpack Compose)
│   └── app/src/main/java/.../
│       ├── service/                  # CaptureService, CameraX, TTS, timer
│       ├── ui/screen/                # Compose screens (Home, Capture, Session, etc.)
│       ├── ui/components/            # ProgressRaceBar, ReviewQuestionsSheet, Pomodoro
│       ├── viewmodel/                # MVVM ViewModels
│       ├── repository/               # Firebase data repositories
│       ├── data/local/               # Room offline queue (PendingUpload)
│       └── worker/                   # WorkManager upload retry
├── firestore.rules     # Firestore security rules
├── storage.rules       # Cloud Storage security rules
├── firebase.json       # Firebase project config
├── product_spec.md     # Product specification (Chinese)
└── technical_design.md # Technical design doc (Chinese)
```

## Test Coverage

```
Cloud Functions: 81 tests / 7 suites ✅
Web App:         26 tests / 3 suites ✅
Total:           107 tests / 10 suites ✅
```

### Cloud Functions (81 tests)

| Suite | Tests | Covers |
|-------|-------|--------|
| `onPageCreated` | 15 | AI question parsing, multi-page binding, error recovery |
| `onCaptureCreated` | 18 | Progress diff detection, plan comparison, parent notification triggers |
| `onSessionCompleted` | 5 | Summary report generation, context data assembly, error handling |
| `feedbackAndNotifications` | 21 | Plan status → feedback message mapping, FCM push conditions, edge cases |
| `calculateStars` | 11 | Efficiency star rating (1–5), boundary values, divide-by-zero safety |
| `rewards` | 8 | Ahead bonus, early finish, streak achievements, personal best |
| `diffDetection` | 3 | Diff prompt generation, boundingBox inclusion, empty input safety |

### Web App (26 tests)

| Suite | Tests | Covers |
|-------|-------|--------|
| `useSession` | 7 | Dashboard state derivation, expected progress calculation, edge cases |
| `progressRaceBar` | 14 | Bar width calculation, badge info mapping, actual vs. planned comparison |
| `auth` | 5 | Anonymous auth state resolution, loading priority, error propagation |

## Documentation

- [📝 Product Specification (v0.3)](product_spec.md)
- [🏗️ Technical Design](technical_design.md)
- [🤝 Contributing](CONTRIBUTING.md)
- [💬 Discussion Log](chat.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR workflow.

## License

[MIT](LICENSE) © stand8one
