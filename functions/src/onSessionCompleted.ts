import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { analyzeWithAI } from "./ai";
import { SESSION_SUMMARY_PROMPT } from "./ai/prompts";
import { calculateRewards, SessionResult } from "./rewards";
import { logger } from "firebase-functions";

interface SummaryResult {
  summary: string;
  highlights: string[];
  suggestions: string[];
  efficiencyStars: number;
}

/**
 * 生成 Session 总结报告 + 计算奖励
 * 在 session 标记为 completed 后调用
 */
export async function generateSessionSummary(
  userId: string,
  sessionId: string
): Promise<void> {
  const db = getFirestore();

  try {
    // 获取 session 数据
    const sessionSnap = await db.doc(`users/${userId}/sessions/${sessionId}`).get();
    const sessionData = sessionSnap.data();
    if (!sessionData) return;

    // 获取所有题目
    const questionsSnap = await db
      .collection(`users/${userId}/sessions/${sessionId}/questions`)
      .get();

    const questions = questionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 获取所有分析
    const analysesSnap = await db
      .collection(`users/${userId}/sessions/${sessionId}/analyses`)
      .orderBy("analyzedAt", "asc")
      .get();

    const analyses = analysesSnap.docs.map((doc) => doc.data());

    // 构建总结数据上下文
    const contextData = {
      totalQuestions: sessionData.totalQuestions,
      completedQuestions: sessionData.completedQuestions,
      totalEstimatedMinutes: sessionData.totalEstimatedMinutes,
      actualMinutes: sessionData.actualMinutes,
      aheadOfPlan: sessionData.aheadOfPlan,
      pomodoroCount: sessionData.pomodoroCount,
      questionTypes: questions.reduce((acc: Record<string, number>, q: Record<string, unknown>) => {
        const type = q.type as string;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      anomalyCount: analyses.filter((a) =>
        (a.anomalies as string[])?.length > 0
      ).length,
    };

    const prompt = `${SESSION_SUMMARY_PROMPT}\n\n## 作业数据\n${JSON.stringify(contextData, null, 2)}`;

    const result = await analyzeWithAI(prompt, []) as SummaryResult;

    // 写入总结
    await db.doc(`users/${userId}/sessions/${sessionId}`).update({
      summary: {
        text: result.summary,
        highlights: result.highlights,
        suggestions: result.suggestions,
        generatedAt: FieldValue.serverTimestamp(),
      },
    });

    // === 激励系统：计算奖励 ===
    try {
      // 获取历史 sessions（最近 50 条）
      const historySnap = await db
        .collection(`users/${userId}/sessions`)
        .where("status", "==", "completed")
        .orderBy("completedAt", "desc")
        .limit(50)
        .get();

      const history: SessionResult[] = historySnap.docs
        .filter((doc) => doc.id !== sessionId) // 排除当前
        .map((doc) => {
          const d = doc.data();
          return {
            sessionId: doc.id,
            totalQuestions: d.totalQuestions || 0,
            completedQuestions: d.completedQuestions || 0,
            totalEstimatedMinutes: d.totalEstimatedMinutes || 0,
            actualMinutes: d.actualMinutes || 0,
            aheadOfPlan: d.aheadOfPlan || 0,
            efficiencyStars: d.efficiencyStars || 0,
            date: d.completedAt?.toDate?.()?.toISOString?.()?.split("T")[0] || "",
          };
        });

      const currentSession: SessionResult = {
        sessionId,
        totalQuestions: sessionData.totalQuestions || 0,
        completedQuestions: sessionData.completedQuestions || 0,
        totalEstimatedMinutes: sessionData.totalEstimatedMinutes || 0,
        actualMinutes: sessionData.actualMinutes || 0,
        aheadOfPlan: sessionData.aheadOfPlan || 0,
        efficiencyStars: sessionData.efficiencyStars || 0,
        date: new Date().toISOString().split("T")[0],
      };

      const reward = calculateRewards(currentSession, history);

      // 写入奖励记录
      await db.collection(`users/${userId}/rewards`).add({
        sessionId,
        points: reward.points,
        breakdown: reward.breakdown,
        achievements: reward.achievements,
        isPersonalBest: reward.isPersonalBest,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 更新 session 的奖励数据
      await db.doc(`users/${userId}/sessions/${sessionId}`).update({
        reward: {
          points: reward.points,
          achievements: reward.achievements,
          isPersonalBest: reward.isPersonalBest,
        },
      });

      // 更新用户总积分
      await db.doc(`users/${userId}`).update({
        totalPoints: FieldValue.increment(reward.points),
      });

      logger.info(`Rewards calculated for ${sessionId}: ${reward.points} points, ${reward.achievements.length} achievements`);
    } catch (rewardError) {
      logger.error(`Error calculating rewards for ${sessionId}:`, rewardError);
      // 奖励计算失败不影响总结报告
    }

    logger.info(`Session summary generated for ${sessionId}`);
  } catch (error) {
    logger.error(`Error generating session summary for ${sessionId}:`, error);
  }
}

