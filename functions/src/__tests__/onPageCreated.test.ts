/**
 * CF-1 集成测试：拍照上传后 AI 识别出题目 (onPageCreated)
 *
 * 用户故事：孩子拍了一张数学试卷照片上传。
 * 系统通过 Gemini 识别出 8 道题，每道有编号、类型、预估时间。
 */

// ====== Mock Setup ======

// Mock Firestore batch operations
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
};

const mockDoc = jest.fn().mockReturnValue({ id: "question_doc_id" });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockSessionDoc = jest.fn().mockReturnValue({ id: "session_001" });

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    batch: () => mockBatch,
    collection: mockCollection,
    doc: mockSessionDoc,
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
    increment: jest.fn((n: number) => ({ _increment: n })),
  },
}));

// Mock Storage
const mockDownload = jest.fn();
const mockFile = jest.fn(() => ({ download: mockDownload }));
const mockBucket = jest.fn(() => ({ file: mockFile }));

jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({
    bucket: mockBucket,
  })),
}));

// Mock Gemini client
const mockAnalyzeWithGemini = jest.fn();
jest.mock("../gemini/client", () => ({
  analyzeWithGemini: (...args: unknown[]) => mockAnalyzeWithGemini(...args),
}));

// Mock firebase-functions logger
jest.mock("firebase-functions", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { handlePageCreated } from "../onPageCreated";

// Helper to create a mock FirestoreEvent
function createMockEvent(pageData: Record<string, unknown>, params: Record<string, string>) {
  const mockRef = { update: jest.fn().mockResolvedValue(undefined) };
  return {
    data: {
      data: () => pageData,
      ref: mockRef,
    },
    params,
  } as any;
}

describe("CF-1: 拍照上传后 AI 识别出题目", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 默认 Storage 返回一张假图片
    mockDownload.mockResolvedValue([Buffer.from("fake_image_data")]);
  });

  it("Gemini 返回 8 道题 → 全部写入 questions 子集合", async () => {
    const geminiResult = {
      subject: "数学",
      pageDescription: "三年级数学练习",
      questions: Array.from({ length: 8 }, (_, i) => ({
        index: i + 1,
        label: `第${i + 1}题`,
        type: i % 2 === 0 ? "calculation" : "fill_blank",
        estimatedMinutes: 2,
        boundingBox: { x: 0.1, y: 0.1 * (i + 1), width: 0.8, height: 0.08 },
      })),
    };
    mockAnalyzeWithGemini.mockResolvedValue(geminiResult);

    const event = createMockEvent(
      { originalPhotoUrl: "gs://bucket/users/u1/pages/photo.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    await handlePageCreated(event);

    // 验证：调用了 Gemini
    expect(mockAnalyzeWithGemini).toHaveBeenCalledTimes(1);

    // 验证：写入了 8 个 question 文档
    expect(mockBatchSet).toHaveBeenCalledTimes(8);

    // 验证每个 question 的结构
    const firstCall = mockBatchSet.mock.calls[0][1];
    expect(firstCall).toMatchObject({
      sessionId: "s1",
      pageId: "p1",
      questionIndex: 1,
      status: "unanswered",
      estimatedMinutes: 2,
    });
    expect(firstCall.boundingBox).toBeDefined();
    expect(firstCall.statusUpdatedAt).toBe("SERVER_TIMESTAMP");
    expect(firstCall.actualMinutes).toBeNull();

    // 验证：batch.commit 被调用
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("更新 page 状态为 parsed", async () => {
    mockAnalyzeWithGemini.mockResolvedValue({
      subject: "语文",
      pageDescription: "语文阅读",
      questions: [
        { index: 1, label: "第1题", type: "reading", estimatedMinutes: 3, boundingBox: { x: 0, y: 0, width: 1, height: 0.5 } },
      ],
    });

    const event = createMockEvent(
      { originalPhotoUrl: "gs://bucket/path/photo.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    await handlePageCreated(event);

    // 验证 page 状态更新
    const pageUpdateCall = mockBatchUpdate.mock.calls.find(
      ([ref, data]: [any, any]) => data.status === "parsed"
    );
    expect(pageUpdateCall).toBeTruthy();
    expect(pageUpdateCall![1]).toMatchObject({
      status: "parsed",
      subject: "语文",
      questionsCount: 1,
    });
  });

  it("session.totalQuestions 和 totalEstimatedMinutes 增量更新", async () => {
    mockAnalyzeWithGemini.mockResolvedValue({
      subject: "数学",
      pageDescription: "",
      questions: [
        { index: 1, label: "第1题", type: "calculation", estimatedMinutes: 2, boundingBox: { x: 0, y: 0, width: 1, height: 0.3 } },
        { index: 2, label: "第2题", type: "calculation", estimatedMinutes: 3, boundingBox: { x: 0, y: 0.3, width: 1, height: 0.3 } },
        { index: 3, label: "第3题", type: "fill_blank", estimatedMinutes: 1, boundingBox: { x: 0, y: 0.6, width: 1, height: 0.3 } },
      ],
    });

    const event = createMockEvent(
      { originalPhotoUrl: "gs://bucket/path/photo.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    await handlePageCreated(event);

    // 验证 session 更新用 FieldValue.increment
    const sessionUpdateCall = mockBatchUpdate.mock.calls.find(
      ([ref, data]: [any, any]) => data.totalQuestions !== undefined
    );
    expect(sessionUpdateCall).toBeTruthy();
    expect(sessionUpdateCall![1].totalQuestions).toEqual({ _increment: 3 });
    expect(sessionUpdateCall![1].totalEstimatedMinutes).toEqual({ _increment: 6 }); // 2+3+1
  });

  it("照片模糊 → Gemini 返回空 questions → page 标记 parsed，不报错", async () => {
    mockAnalyzeWithGemini.mockResolvedValue({
      subject: "未知",
      pageDescription: "照片模糊",
      questions: [],
    });

    const event = createMockEvent(
      { originalPhotoUrl: "gs://bucket/path/blurry.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    // 不应抛出异常
    await expect(handlePageCreated(event)).resolves.not.toThrow();

    // 不应写入任何 question
    expect(mockBatchSet).not.toHaveBeenCalled();

    // page 仍然标记 parsed
    const pageUpdateCall = mockBatchUpdate.mock.calls.find(
      ([ref, data]: [any, any]) => data.status === "parsed"
    );
    expect(pageUpdateCall).toBeTruthy();
    expect(pageUpdateCall![1].questionsCount).toBe(0);
  });

  it("Gemini API 出错 → page 标记 error", async () => {
    mockAnalyzeWithGemini.mockRejectedValue(new Error("Gemini API timeout"));

    const event = createMockEvent(
      { originalPhotoUrl: "gs://bucket/path/photo.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    // 不应抛异常到上层
    await expect(handlePageCreated(event)).resolves.not.toThrow();

    // page 标记为 error
    expect(event.data.ref.update).toHaveBeenCalledWith({ status: "error" });
  });

  it("event.data 为 undefined → 直接返回", async () => {
    const event = { data: undefined, params: {} } as any;
    await expect(handlePageCreated(event)).resolves.not.toThrow();
    expect(mockAnalyzeWithGemini).not.toHaveBeenCalled();
  });

  it("Storage 下载照片 → 转 base64 传给 Gemini", async () => {
    const fakeImageData = Buffer.from("real_image_bytes");
    mockDownload.mockResolvedValue([fakeImageData]);

    mockAnalyzeWithGemini.mockResolvedValue({
      subject: "英语", pageDescription: "", questions: [],
    });

    const event = createMockEvent(
      { originalPhotoUrl: "gs://my-bucket/users/u1/pages/img.jpg" },
      { userId: "u1", sessionId: "s1", pageId: "p1" }
    );

    await handlePageCreated(event);

    // 验证 Gemini 收到了 base64 编码的图片
    const geminiCall = mockAnalyzeWithGemini.mock.calls[0];
    expect(geminiCall[1]).toEqual([
      { mimeType: "image/jpeg", data: fakeImageData.toString("base64") },
    ]);
  });
});
