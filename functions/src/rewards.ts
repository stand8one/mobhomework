/**
 * 激励系统 — 纯业务逻辑
 *
 * 基于 spec §7：所有激励都基于「和自己的计划比」
 * - 超越计划奖：每次跑赢计划线
 * - 提前完成奖：比预估总时间更快完成
 * - 连续领先：连续 3 次领先解锁成就
 * - 个人最佳：打破历史最快记录
 * - 效率星级：已在 logic.ts 实现
 */

export interface SessionResult {
  sessionId: string;
  totalQuestions: number;
  completedQuestions: number;
  totalEstimatedMinutes: number;
  actualMinutes: number;
  aheadOfPlan: number; // delta: positive = ahead
  efficiencyStars: number;
  date: string; // YYYY-MM-DD
}

export interface RewardResult {
  points: number;
  breakdown: {
    basePoints: number;       // 完成作业基础分
    aheadBonus: number;       // 超越计划奖
    earlyFinishBonus: number; // 提前完成奖
    personalBestBonus: number;// 个人最佳奖
  };
  achievements: string[];     // 新解锁的成就 ID
  isPersonalBest: boolean;
}

/**
 * 计算单次 session 奖励积分
 */
export function calculateRewards(
  session: SessionResult,
  history: SessionResult[]
): RewardResult {
  const breakdown = {
    basePoints: 0,
    aheadBonus: 0,
    earlyFinishBonus: 0,
    personalBestBonus: 0,
  };

  // 1. 基础分：完成作业 = 10 分
  if (session.completedQuestions >= session.totalQuestions && session.totalQuestions > 0) {
    breakdown.basePoints = 10;
  }

  // 2. 超越计划奖：领先的每题 +2 分
  if (session.aheadOfPlan > 0) {
    breakdown.aheadBonus = session.aheadOfPlan * 2;
  }

  // 3. 提前完成奖：比预估时间快 20%+ → +10 分
  if (
    session.actualMinutes > 0 &&
    session.totalEstimatedMinutes > 0 &&
    session.actualMinutes < session.totalEstimatedMinutes * 0.8
  ) {
    breakdown.earlyFinishBonus = 10;
  }

  // 4. 个人最佳：效率（题/分钟）超过历史最佳 → +15 分
  const isPersonalBest = checkPersonalBest(session, history);
  if (isPersonalBest) {
    breakdown.personalBestBonus = 15;
  }

  // 5. 成就检测
  const achievements = checkAchievements(session, history);

  const points =
    breakdown.basePoints +
    breakdown.aheadBonus +
    breakdown.earlyFinishBonus +
    breakdown.personalBestBonus;

  return { points, breakdown, achievements, isPersonalBest };
}

/**
 * 检测是否打破个人最佳效率（题/分钟）
 */
export function checkPersonalBest(
  current: SessionResult,
  history: SessionResult[]
): boolean {
  if (current.actualMinutes <= 0 || current.totalQuestions <= 0) return false;

  const currentEfficiency = current.completedQuestions / current.actualMinutes;

  const pastBest = history
    .filter((s) => s.actualMinutes > 0 && s.completedQuestions > 0)
    .reduce((best, s) => {
      const eff = s.completedQuestions / s.actualMinutes;
      return eff > best ? eff : best;
    }, 0);

  return currentEfficiency > pastBest && pastBest > 0;
}

/**
 * 检测新解锁的成就
 */
export function checkAchievements(
  current: SessionResult,
  history: SessionResult[]
): string[] {
  const achievements: string[] = [];
  const all = [...history, current];

  // 连续领先 3 次
  if (all.length >= 3) {
    const lastThree = all.slice(-3);
    if (lastThree.every((s) => s.aheadOfPlan > 0)) {
      achievements.push("streak_3_ahead");
    }
  }

  // 连续领先 5 次
  if (all.length >= 5) {
    const lastFive = all.slice(-5);
    if (lastFive.every((s) => s.aheadOfPlan > 0)) {
      achievements.push("streak_5_ahead");
    }
  }

  // 首次 5 星
  if (current.efficiencyStars === 5 && !history.some((s) => s.efficiencyStars === 5)) {
    achievements.push("first_5_stars");
  }

  // 完成 10 次作业
  if (all.length === 10) {
    achievements.push("10_sessions_completed");
  }

  // 完成 50 次作业
  if (all.length === 50) {
    achievements.push("50_sessions_completed");
  }

  return achievements;
}
