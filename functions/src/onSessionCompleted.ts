import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { analyzeWithGemini } from "./gemini/client";
import { SESSION_SUMMARY_PROMPT } from "./gemini/prompts";
import { logger } from "firebase-functions";

interface SummaryResult {
  summary: string;
  highlights: string[];
  suggestions: string[];
  efficiencyStars: number;
}

/**
 * 生成 Session 总结报告
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

    const result = await analyzeWithGemini(prompt, []) as SummaryResult;

    // 写入总结
    await db.doc(`users/${userId}/sessions/${sessionId}`).update({
      summary: {
        text: result.summary,
        highlights: result.highlights,
        suggestions: result.suggestions,
        generatedAt: FieldValue.serverTimestamp(),
      },
    });

    logger.info(`Session summary generated for ${sessionId}`);
  } catch (error) {
    logger.error(`Error generating session summary for ${sessionId}:`, error);
  }
}
