/**
 * CF-5 集成测试：全部完成→总结报告 (onSessionCompleted)
 *
 * 用户故事：孩子做完全部 20 题，session 标记 completed。
 * 系统生成总结报告，包含亮点、建议和效率星级。
 */

// ====== Mock Setup ======

const mockSessionGet = jest.fn();
const mockSessionUpdate = jest.fn().mockResolvedValue(undefined);
const mockQuestionsGet = jest.fn();
const mockAnalysesGet = jest.fn();

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn((path: string) => ({
      get: mockSessionGet,
      update: mockSessionUpdate,
    })),
    collection: jest.fn((path: string) => {
      if (path.includes("/questions")) {
        return { get: mockQuestionsGet };
      }
      if (path.includes("/analyses")) {
        return {
          orderBy: jest.fn(() => ({ get: mockAnalysesGet })),
        };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    }),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
  },
}));

const mockAnalyzeWithAI = jest.fn();
jest.mock("../ai", () => ({
  analyzeWithAI: (...args: unknown[]) => mockAnalyzeWithAI(...args),
}));

jest.mock("../ai/prompts", () => ({
  SESSION_SUMMARY_PROMPT: "Generate a session summary.",
}));

jest.mock("firebase-functions", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { generateSessionSummary } from "../onSessionCompleted";

describe("CF-5: 全部完成→总结报告", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("生成完整总结报告写入 session.summary", async () => {
    // Setup
    mockSessionGet.mockResolvedValue({
      data: () => ({
        totalQuestions: 20,
        completedQuestions: 20,
        totalEstimatedMinutes: 45,
        actualMinutes: 38,
        aheadOfPlan: 3,
        pomodoroCount: 2,
      }),
    });

    mockQuestionsGet.mockResolvedValue({
      docs: Array.from({ length: 20 }, (_, i) => ({
        id: `q${i + 1}`,
        data: () => ({
          type: i < 10 ? "calculation" : "fill_blank",
          status: "completed",
          estimatedMinutes: 2,
        }),
      })),
    });

    mockAnalysesGet.mockResolvedValue({
      docs: [
        { data: () => ({ anomalies: [] }) },
        { data: () => ({ anomalies: ["stalled"] }) },
        { data: () => ({ anomalies: [] }) },
      ],
    });

    mockAnalyzeWithAI.mockResolvedValue({
      summary: "今天表现很出色！数学计算完成得很快。",
      highlights: ["计算题完成速度超预期", "全程专注度高"],
      suggestions: ["填空题可以再仔细检查一下"],
      efficiencyStars: 4,
    });

    await generateSessionSummary("u1", "s1");

    // 验证：Gemini 被调用
    expect(mockAnalyzeWithAI).toHaveBeenCalledTimes(1);
    const promptArg = mockAnalyzeWithAI.mock.calls[0][0] as string;
    expect(promptArg).toContain("Generate a session summary");
    expect(promptArg).toContain("totalQuestions");

    // 验证：总结写入到 session
    expect(mockSessionUpdate).toHaveBeenCalledTimes(1);
    const updateData = mockSessionUpdate.mock.calls[0][0];
    expect(updateData.summary.text).toBe("今天表现很出色！数学计算完成得很快。");
    expect(updateData.summary.highlights).toHaveLength(2);
    expect(updateData.summary.suggestions).toHaveLength(1);
    expect(updateData.summary.generatedAt).toBe("SERVER_TIMESTAMP");
  });

  it("contextData 包含题目类型统计", async () => {
    mockSessionGet.mockResolvedValue({
      data: () => ({
        totalQuestions: 5,
        completedQuestions: 5,
        totalEstimatedMinutes: 15,
        actualMinutes: 12,
        aheadOfPlan: 1,
        pomodoroCount: 1,
      }),
    });

    mockQuestionsGet.mockResolvedValue({
      docs: [
        { id: "q1", data: () => ({ type: "calculation", status: "completed" }) },
        { id: "q2", data: () => ({ type: "calculation", status: "completed" }) },
        { id: "q3", data: () => ({ type: "fill_blank", status: "completed" }) },
        { id: "q4", data: () => ({ type: "essay", status: "completed" }) },
        { id: "q5", data: () => ({ type: "calculation", status: "completed" }) },
      ],
    });

    mockAnalysesGet.mockResolvedValue({ docs: [] });

    mockAnalyzeWithAI.mockResolvedValue({
      summary: "好", highlights: [], suggestions: [], efficiencyStars: 3,
    });

    await generateSessionSummary("u1", "s1");

    // 验证 prompt 包含题目类型统计
    const promptArg = mockAnalyzeWithAI.mock.calls[0][0] as string;
    const contextMatch = promptArg.match(/## 作业数据\n([\s\S]+)/);
    expect(contextMatch).toBeTruthy();
    const contextData = JSON.parse(contextMatch![1]);
    expect(contextData.questionTypes).toEqual({
      calculation: 3,
      fill_blank: 1,
      essay: 1,
    });
  });

  it("contextData 包含异常次数统计", async () => {
    mockSessionGet.mockResolvedValue({
      data: () => ({
        totalQuestions: 3, completedQuestions: 3,
        totalEstimatedMinutes: 9, actualMinutes: 15,
        aheadOfPlan: -2, pomodoroCount: 0,
      }),
    });

    mockQuestionsGet.mockResolvedValue({
      docs: [
        { id: "q1", data: () => ({ type: "calc", status: "completed" }) },
      ],
    });

    mockAnalysesGet.mockResolvedValue({
      docs: [
        { data: () => ({ anomalies: ["left_desk", "stalled"] }) },
        { data: () => ({ anomalies: [] }) },
        { data: () => ({ anomalies: ["stalled"] }) },
      ],
    });

    mockAnalyzeWithAI.mockResolvedValue({
      summary: "有些分心", highlights: [], suggestions: [], efficiencyStars: 2,
    });

    await generateSessionSummary("u1", "s1");

    const promptArg = mockAnalyzeWithAI.mock.calls[0][0] as string;
    const contextData = JSON.parse(promptArg.split("## 作业数据\n")[1]);
    expect(contextData.anomalyCount).toBe(2); // 2 analyses had anomalies
  });

  it("session 数据为空 → 直接返回，不崩溃", async () => {
    mockSessionGet.mockResolvedValue({ data: () => undefined });

    await expect(generateSessionSummary("u1", "s1")).resolves.not.toThrow();
    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
  });

  it("Gemini 出错 → 不崩溃", async () => {
    mockSessionGet.mockResolvedValue({
      data: () => ({
        totalQuestions: 1, completedQuestions: 1,
        totalEstimatedMinutes: 3, actualMinutes: 2,
        aheadOfPlan: 0, pomodoroCount: 0,
      }),
    });
    mockQuestionsGet.mockResolvedValue({ docs: [] });
    mockAnalysesGet.mockResolvedValue({ docs: [] });
    mockAnalyzeWithAI.mockRejectedValue(new Error("API error"));

    await expect(generateSessionSummary("u1", "s1")).resolves.not.toThrow();
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });
});
