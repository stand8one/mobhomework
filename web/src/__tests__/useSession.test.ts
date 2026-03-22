/**
 * WB-1: 实时看板数据同步测试
 *
 * 测试 useSession hook 中的数据转换逻辑
 */
import { describe, it, expect } from "vitest";

// 从 useSession hook 中提取的纯数据转换函数

interface SessionData {
  id: string;
  status: string;
  totalQuestions: number;
  completedQuestions: number;
  aheadOfPlan: number;
  totalEstimatedMinutes: number;
  startedAt: Date | null;
}

interface DashboardState {
  hasSession: boolean;
  isActive: boolean;
  isCompleted: boolean;
  progressPercent: number;
  expectedProgressPercent: number;
  aheadOfPlan: number;
  estimatedCompletionTime: Date | null;
}

/**
 * 将 Firestore session 数据转换为看板状态
 */
function sessionToDashboardState(
  session: SessionData | null,
  now: Date
): DashboardState {
  if (!session) {
    return {
      hasSession: false,
      isActive: false,
      isCompleted: false,
      progressPercent: 0,
      expectedProgressPercent: 0,
      aheadOfPlan: 0,
      estimatedCompletionTime: null,
    };
  }

  const isActive = session.status === "in_progress";
  const isCompleted = session.status === "completed";
  const total = Math.max(session.totalQuestions, 1);
  const progressPercent = Math.round((session.completedQuestions / total) * 100);

  let expectedProgressPercent = 0;
  let estimatedCompletionTime: Date | null = null;

  if (isActive && session.startedAt && session.totalEstimatedMinutes > 0) {
    const elapsed = (now.getTime() - session.startedAt.getTime()) / 60000;
    expectedProgressPercent = Math.min(
      100,
      Math.round((elapsed / session.totalEstimatedMinutes) * 100)
    );

    // 根据当前速度预估完成时间
    if (session.completedQuestions > 0) {
      const minutesPerQuestion = elapsed / session.completedQuestions;
      const remaining = session.totalQuestions - session.completedQuestions;
      const estimatedRemainingMinutes = remaining * minutesPerQuestion;
      estimatedCompletionTime = new Date(
        now.getTime() + estimatedRemainingMinutes * 60000
      );
    }
  }

  return {
    hasSession: true,
    isActive,
    isCompleted,
    progressPercent,
    expectedProgressPercent,
    aheadOfPlan: session.aheadOfPlan,
    estimatedCompletionTime,
  };
}

describe("WB-1: 实时看板数据同步", () => {
  const now = new Date("2026-03-22T17:00:00Z");

  describe("sessionToDashboardState", () => {
    it("无 session → hasSession=false", () => {
      const state = sessionToDashboardState(null, now);
      expect(state.hasSession).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.progressPercent).toBe(0);
    });

    it("进行中 session → isActive=true", () => {
      const session: SessionData = {
        id: "s1",
        status: "in_progress",
        totalQuestions: 20,
        completedQuestions: 10,
        aheadOfPlan: 2,
        totalEstimatedMinutes: 40,
        startedAt: new Date("2026-03-22T16:40:00Z"), // 20 min ago
      };
      const state = sessionToDashboardState(session, now);
      expect(state.hasSession).toBe(true);
      expect(state.isActive).toBe(true);
      expect(state.progressPercent).toBe(50); // 10/20
    });

    it("已完成 session → isCompleted=true", () => {
      const session: SessionData = {
        id: "s1",
        status: "completed",
        totalQuestions: 20,
        completedQuestions: 20,
        aheadOfPlan: 3,
        totalEstimatedMinutes: 40,
        startedAt: new Date("2026-03-22T16:20:00Z"),
      };
      const state = sessionToDashboardState(session, now);
      expect(state.isCompleted).toBe(true);
      expect(state.progressPercent).toBe(100);
    });

    it("expectedProgressPercent 根据时间比例计算", () => {
      const session: SessionData = {
        id: "s1",
        status: "in_progress",
        totalQuestions: 20,
        completedQuestions: 5,
        aheadOfPlan: 0,
        totalEstimatedMinutes: 40,
        startedAt: new Date("2026-03-22T16:40:00Z"), // 20 min ago
      };
      const state = sessionToDashboardState(session, now);
      // 20min elapsed / 40min total = 50%
      expect(state.expectedProgressPercent).toBe(50);
    });

    it("estimatedCompletionTime 基于当前速度外推", () => {
      const session: SessionData = {
        id: "s1",
        status: "in_progress",
        totalQuestions: 20,
        completedQuestions: 10,
        aheadOfPlan: 0,
        totalEstimatedMinutes: 40,
        startedAt: new Date("2026-03-22T16:40:00Z"), // 20 min ago
      };
      const state = sessionToDashboardState(session, now);
      // 10 questions in 20 min = 2 min/q, 10 remaining = 20 min
      expect(state.estimatedCompletionTime).toBeTruthy();
      const remaining = state.estimatedCompletionTime!.getTime() - now.getTime();
      expect(remaining).toBeCloseTo(20 * 60000, -3); // ~20 minutes
    });

    it("完成数=0 → estimatedCompletionTime=null", () => {
      const session: SessionData = {
        id: "s1",
        status: "in_progress",
        totalQuestions: 20,
        completedQuestions: 0,
        aheadOfPlan: 0,
        totalEstimatedMinutes: 40,
        startedAt: new Date("2026-03-22T16:55:00Z"),
      };
      const state = sessionToDashboardState(session, now);
      expect(state.estimatedCompletionTime).toBeNull();
    });

    it("totalQuestions=0 → 不除零", () => {
      const session: SessionData = {
        id: "s1",
        status: "created",
        totalQuestions: 0,
        completedQuestions: 0,
        aheadOfPlan: 0,
        totalEstimatedMinutes: 0,
        startedAt: null,
      };
      const state = sessionToDashboardState(session, now);
      expect(state.progressPercent).toBe(0);
    });
  });
});
