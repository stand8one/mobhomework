/**
 * CF-2/4/7/8 集成测试：onCaptureCreated
 *
 * 覆盖：
 * - CF-2: 采集→进度检测
 * - CF-4: 明显落后→推送家长（集成层）
 * - CF-7: 离开检测→通知家长（集成层）
 * - CF-8: 全部完成→推送通知（集成层）
 */

// ====== Mock Setup ======

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
};

const mockEventAdd = jest.fn().mockResolvedValue({ id: "event_id" });
const mockQuestionsGet = jest.fn();
const mockPagesGet = jest.fn();
const mockSessionGet = jest.fn();
const mockUserGet = jest.fn();
const mockSessionUpdate = jest.fn().mockResolvedValue(undefined);

const mockDocFn = jest.fn((path: string) => {
  if (path.includes("/sessions/") && !path.includes("/questions/")) {
    return { get: mockSessionGet, update: mockSessionUpdate, id: "session_001" };
  }
  if (path.includes("/questions/")) {
    return { id: path.split("/").pop() };
  }
  if (path.match(/^users\/[^/]+$/)) {
    return { get: mockUserGet };
  }
  return { id: "mock_doc" };
});

const mockCollectionFn = jest.fn((path: string) => {
  if (path.includes("/questions")) {
    return { get: mockQuestionsGet };
  }
  if (path.includes("/pages")) {
    return { get: mockPagesGet };
  }
  if (path.includes("/analyses")) {
    return { doc: () => ({ id: "analysis_id" }) };
  }
  if (path.includes("/events")) {
    return { add: mockEventAdd };
  }
  return { doc: () => ({ id: "mock" }) };
});

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    batch: () => mockBatch,
    collection: mockCollectionFn,
    doc: mockDocFn,
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    increment: jest.fn((n: number) => ({ _increment: n })),
  },
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
  },
}));

// Mock Storage
const mockDownload = jest.fn().mockResolvedValue([Buffer.from("img")]);
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({
    bucket: () => ({
      file: () => ({ download: mockDownload }),
    }),
  })),
}));

// Mock AI
const mockAnalyzeWithAI = jest.fn();
jest.mock("../ai", () => ({
  analyzeWithAI: (...args: unknown[]) => mockAnalyzeWithAI(...args),
  getAIModelName: () => "test-model",
}));

// Mock prompts
jest.mock("../ai/prompts", () => ({
  buildProgressPrompt: jest.fn(() => "mock_prompt"),
}));

// Mock notifications
const mockSendNotification = jest.fn().mockResolvedValue(undefined);
jest.mock("../notifications", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

// Mock logger
jest.mock("firebase-functions", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { handleCaptureCreated } from "../onCaptureCreated";

// Helpers
function createCaptureEvent(
  captureData: Record<string, unknown>,
  params: Record<string, string>
) {
  const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
  return {
    data: { data: () => captureData, ref: mockRef },
    params,
  } as any;
}

function setupDefaultMocks(overrides: {
  questionsStatus?: Record<string, string>;
  sessionData?: Record<string, unknown>;
  userData?: Record<string, unknown>;
  geminiResult?: Record<string, unknown>;
} = {}) {
  const startedAt = Date.now() - 15 * 60 * 1000; // 15 min ago

  // Questions
  const questions = overrides.questionsStatus || {
    q1: "unanswered", q2: "unanswered", q3: "unanswered",
    q4: "unanswered", q5: "unanswered",
  };
  mockQuestionsGet.mockResolvedValue({
    docs: Object.entries(questions).map(([id, status]) => ({
      id,
      data: () => ({ status }),
    })),
  });

  // Pages
  mockPagesGet.mockResolvedValue({
    docs: [{ data: () => ({ originalPhotoUrl: "gs://b/page.jpg" }) }],
  });

  // Session
  mockSessionGet.mockResolvedValue({
    data: () => ({
      totalQuestions: Object.keys(questions).length,
      completedQuestions: Object.values(questions).filter(s => s === "completed").length,
      totalEstimatedMinutes: Object.keys(questions).length * 3, // 3 min each
      startedAt: { toMillis: () => startedAt },
      ...overrides.sessionData,
    }),
  });

  // User
  mockUserGet.mockResolvedValue({
    data: () => ({
      childName: "小明",
      settings: {
        notifications: {
          significantLag: true,
          prolongedLeave: true,
          sessionComplete: true,
        },
      },
      ...overrides.userData,
    }),
  });

  // Gemini result
  mockAnalyzeWithAI.mockResolvedValue(overrides.geminiResult || {
    matchedPageId: "page_001",
    questionsProgress: [
      { questionId: "q1", newStatus: "completed", confidence: 0.95 },
      { questionId: "q2", newStatus: "completed", confidence: 0.88 },
      { questionId: "q3", newStatus: "in_progress", confidence: 0.7 },
    ],
    anomalies: [],
    sceneDescription: "孩子正在写第3题",
  });
}

const defaultParams = { userId: "u1", sessionId: "s1", captureId: "c1" };

describe("CF-2: 采集→进度检测", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("quality=occluded → 跳过，标记 skipped", async () => {
    const event = createCaptureEvent(
      { quality: "occluded", photoUrl: "gs://b/photo.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 不应调用 Gemini
    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    // capture 标记 skipped
    expect(event.data.ref.update).toHaveBeenCalledWith({ analysisStatus: "skipped" });
  });

  it("quality=blurry → 跳过", async () => {
    const event = createCaptureEvent(
      { quality: "blurry", photoUrl: "gs://b/photo.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);
    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    expect(event.data.ref.update).toHaveBeenCalledWith({ analysisStatus: "skipped" });
  });

  it("quality=good → 调用 Gemini 并更新题目状态", async () => {
    setupDefaultMocks();
    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/capture.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 应调用 Gemini
    expect(mockAnalyzeWithAI).toHaveBeenCalledTimes(1);
    // batch commit 被调用
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("低置信度 (confidence < 0.5) → 不更新题目状态", async () => {
    setupDefaultMocks({
      geminiResult: {
        matchedPageId: "page_001",
        questionsProgress: [
          { questionId: "q1", newStatus: "completed", confidence: 0.3 }, // 低
          { questionId: "q2", newStatus: "completed", confidence: 0.9 }, // 高
        ],
        anomalies: [],
        sceneDescription: "",
      },
    });

    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/capture.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 只有 q2 被更新（高置信度），q1 被跳过
    const questionUpdates = mockBatchUpdate.mock.calls.filter(
      ([ref, data]: [any, any]) => data.status !== undefined
    );
    expect(questionUpdates.length).toBe(1);
  });

  it("写入 analysis 包含完整 planComparison", async () => {
    setupDefaultMocks();
    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/capture.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 找到 batch.set 的 analysis 调用
    const analysisSetCall = mockBatchSet.mock.calls[0];
    expect(analysisSetCall).toBeTruthy();
    const analysisData = analysisSetCall[1];
    expect(analysisData.planComparison).toBeDefined();
    expect(analysisData.planComparison.actualCompleted).toBeDefined();
    expect(analysisData.planComparison.expectedCompleted).toBeDefined();
    expect(analysisData.planComparison.delta).toBeDefined();
    expect(analysisData.planComparison.status).toBeDefined();
    expect(analysisData.feedbackToChild).toBeTruthy();
  });

  it("session.completedQuestions 增量更新", async () => {
    setupDefaultMocks();
    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/capture.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 找到 session 更新调用
    const sessionUpdate = mockBatchUpdate.mock.calls.find(
      ([ref, data]: [any, any]) => data.completedQuestions !== undefined
    );
    expect(sessionUpdate).toBeTruthy();
    // completedQuestions 应该是 0 (原始) + 2 (q1, q2 completed) = 2
    expect(sessionUpdate![1].completedQuestions).toBe(2);
  });
});

describe("CF-4/7: 通知家长（集成层）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("明显落后 + significantLag:true → 发送通知 + 写 event", async () => {
    // 设置为明显落后: 0 completed but expected ~5
    setupDefaultMocks({
      questionsStatus: {
        q1: "unanswered", q2: "unanswered", q3: "unanswered",
        q4: "unanswered", q5: "unanswered", q6: "unanswered",
        q7: "unanswered", q8: "unanswered", q9: "unanswered",
        q10: "unanswered",
      },
      sessionData: {
        totalQuestions: 10,
        completedQuestions: 0,
        totalEstimatedMinutes: 10, // 1 min each, 15 min elapsed → expected ~10
        startedAt: { toMillis: () => Date.now() - 15 * 60 * 1000 },
      },
      geminiResult: {
        matchedPageId: null,
        questionsProgress: [], // no progress at all
        anomalies: [],
        sceneDescription: "",
      },
    });

    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/photo.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 应发送通知
    expect(mockSendNotification).toHaveBeenCalled();
    const notifCall = mockSendNotification.mock.calls[0];
    expect(notifCall[1].type).toBe("significant_lag");
    expect(notifCall[1].body).toContain("小明");

    // 应写入 event
    expect(mockEventAdd).toHaveBeenCalled();
  });

  it("离开座位 + prolongedLeave:true → 发送通知", async () => {
    setupDefaultMocks({
      geminiResult: {
        matchedPageId: null,
        questionsProgress: [],
        anomalies: ["left_desk"],
        sceneDescription: "桌面空无一人",
      },
    });

    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/photo.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // 查找 left_desk 通知
    const leaveNotif = mockSendNotification.mock.calls.find(
      ([userId, payload]: [any, any]) => payload.type === "prolonged_leave"
    );
    expect(leaveNotif).toBeTruthy();
    expect(leaveNotif![1].body).toContain("小明");
  });
});

describe("CF-8: 全部完成→推送通知（集成层）", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("全部完成 → session 标记 completed + 推送通知 + 写 event", async () => {
    setupDefaultMocks({
      questionsStatus: { q1: "unanswered", q2: "completed" },
      sessionData: {
        totalQuestions: 2,
        completedQuestions: 1,
        totalEstimatedMinutes: 6,
        startedAt: { toMillis: () => Date.now() - 10 * 60 * 1000 },
      },
      geminiResult: {
        matchedPageId: "page_001",
        questionsProgress: [
          { questionId: "q1", newStatus: "completed", confidence: 0.95 },
        ],
        anomalies: [],
        sceneDescription: "最后一题完成了",
      },
    });

    const event = createCaptureEvent(
      { quality: "good", photoUrl: "gs://b/photo.jpg" },
      defaultParams
    );

    await handleCaptureCreated(event);

    // session 应标记 completed
    expect(mockSessionUpdate).toHaveBeenCalled();
    const updateCall = mockSessionUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe("completed");
    expect(updateCall.efficiencyStars).toBeDefined();
    expect(updateCall.efficiencyStars).toBeGreaterThanOrEqual(1);
    expect(updateCall.efficiencyStars).toBeLessThanOrEqual(5);

    // 应推送完成通知
    const completeNotif = mockSendNotification.mock.calls.find(
      ([uid, payload]: [any, any]) => payload.type === "session_complete"
    );
    expect(completeNotif).toBeTruthy();
    expect(completeNotif![1].title).toContain("🎉");
    expect(completeNotif![1].body).toContain("小明");
  });
});
