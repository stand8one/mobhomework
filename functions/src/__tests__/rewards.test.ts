import {
  calculateRewards,
  checkPersonalBest,
  checkAchievements,
  SessionResult,
} from "../rewards";

const baseSession: SessionResult = {
  sessionId: "s1",
  totalQuestions: 20,
  completedQuestions: 20,
  totalEstimatedMinutes: 40,
  actualMinutes: 35,
  aheadOfPlan: 3,
  efficiencyStars: 4,
  date: "2026-03-22",
};

describe("B2: 激励系统", () => {
  describe("calculateRewards — 积分计算", () => {
    it("全部完成 → 基础 10 分", () => {
      const session = { ...baseSession, aheadOfPlan: 0 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.basePoints).toBe(10);
    });

    it("未全部完成 → 无基础分", () => {
      const session = { ...baseSession, completedQuestions: 18 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.basePoints).toBe(0);
    });

    it("totalQuestions=0 → 无基础分", () => {
      const session = { ...baseSession, totalQuestions: 0, completedQuestions: 0 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.basePoints).toBe(0);
    });

    it("领先 3 题 → aheadBonus = 6", () => {
      const session = { ...baseSession, aheadOfPlan: 3 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.aheadBonus).toBe(6);
    });

    it("落后 → aheadBonus = 0", () => {
      const session = { ...baseSession, aheadOfPlan: -2 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.aheadBonus).toBe(0);
    });

    it("比预估快 20%+ → earlyFinishBonus = 10", () => {
      // 预估 40 min, 实际 30 min → 30 < 40*0.8=32 → 提前完成
      const session = { ...baseSession, actualMinutes: 30 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.earlyFinishBonus).toBe(10);
    });

    it("刚好 80% → 无提前完成奖", () => {
      const session = { ...baseSession, actualMinutes: 32 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.earlyFinishBonus).toBe(0);
    });

    it("超时完成 → 无提前完成奖", () => {
      const session = { ...baseSession, actualMinutes: 50 };
      const result = calculateRewards(session, []);
      expect(result.breakdown.earlyFinishBonus).toBe(0);
    });

    it("总分 = 各项之和", () => {
      // base=10, ahead=3*2=6, earlyFinish=10 (30<32), personalBest=0
      const session = { ...baseSession, aheadOfPlan: 3, actualMinutes: 30 };
      const result = calculateRewards(session, []);
      expect(result.points).toBe(
        result.breakdown.basePoints +
        result.breakdown.aheadBonus +
        result.breakdown.earlyFinishBonus +
        result.breakdown.personalBestBonus
      );
    });
  });

  describe("checkPersonalBest — 个人最佳", () => {
    it("效率超过历史最佳 → true", () => {
      // 历史: 20题/40min = 0.5 题/min
      // 当前: 20题/30min = 0.67 题/min → 超越
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", actualMinutes: 40 },
      ];
      const current = { ...baseSession, actualMinutes: 30 };
      expect(checkPersonalBest(current, history)).toBe(true);
    });

    it("效率低于历史 → false", () => {
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", actualMinutes: 25 },
      ];
      const current = { ...baseSession, actualMinutes: 40 };
      expect(checkPersonalBest(current, history)).toBe(false);
    });

    it("无历史数据 → false（无法比较）", () => {
      expect(checkPersonalBest(baseSession, [])).toBe(false);
    });

    it("actualMinutes=0 → false（防除零）", () => {
      const current = { ...baseSession, actualMinutes: 0 };
      expect(checkPersonalBest(current, [baseSession])).toBe(false);
    });
  });

  describe("checkAchievements — 成就系统", () => {
    it("连续 3 次领先 → streak_3_ahead", () => {
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", aheadOfPlan: 2 },
        { ...baseSession, sessionId: "h2", aheadOfPlan: 1 },
      ];
      const current = { ...baseSession, aheadOfPlan: 3 };
      const achievements = checkAchievements(current, history);
      expect(achievements).toContain("streak_3_ahead");
    });

    it("连续 2 次领先 + 当前落后 → 无 streak", () => {
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", aheadOfPlan: 2 },
        { ...baseSession, sessionId: "h2", aheadOfPlan: 1 },
      ];
      const current = { ...baseSession, aheadOfPlan: -1 };
      const achievements = checkAchievements(current, history);
      expect(achievements).not.toContain("streak_3_ahead");
    });

    it("连续 5 次领先 → streak_5_ahead + streak_3_ahead", () => {
      const history: SessionResult[] = Array.from({ length: 4 }, (_, i) => ({
        ...baseSession,
        sessionId: `h${i}`,
        aheadOfPlan: i + 1,
      }));
      const current = { ...baseSession, aheadOfPlan: 5 };
      const achievements = checkAchievements(current, history);
      expect(achievements).toContain("streak_5_ahead");
      expect(achievements).toContain("streak_3_ahead");
    });

    it("首次 5 星 → first_5_stars", () => {
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", efficiencyStars: 3 },
      ];
      const current = { ...baseSession, efficiencyStars: 5 };
      const achievements = checkAchievements(current, history);
      expect(achievements).toContain("first_5_stars");
    });

    it("已有 5 星历史 → 不重复解锁", () => {
      const history: SessionResult[] = [
        { ...baseSession, sessionId: "h1", efficiencyStars: 5 },
      ];
      const current = { ...baseSession, efficiencyStars: 5 };
      const achievements = checkAchievements(current, history);
      expect(achievements).not.toContain("first_5_stars");
    });

    it("第 10 次完成 → 10_sessions_completed", () => {
      const history = Array.from({ length: 9 }, (_, i) => ({
        ...baseSession,
        sessionId: `h${i}`,
      }));
      const achievements = checkAchievements(baseSession, history);
      expect(achievements).toContain("10_sessions_completed");
    });

    it("第 9 次 → 不触发 10 里程碑", () => {
      const history = Array.from({ length: 8 }, (_, i) => ({
        ...baseSession,
        sessionId: `h${i}`,
      }));
      const achievements = checkAchievements(baseSession, history);
      expect(achievements).not.toContain("10_sessions_completed");
    });
  });
});
