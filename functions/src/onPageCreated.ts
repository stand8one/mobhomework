import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { analyzeWithGemini } from "./gemini/client";
import { PAGE_PARSE_PROMPT } from "./gemini/prompts";
import { logger } from "firebase-functions";

interface ParsedQuestion {
  index: number;
  label: string;
  type: string;
  estimatedMinutes: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ParseResult {
  subject: string;
  pageDescription: string;
  questions: ParsedQuestion[];
}

/**
 * 当新的作业页面被录入时触发
 * 1. 从 Storage 获取照片
 * 2. 调用 Gemini 解析题目
 * 3. 写入 questions 子集合
 * 4. 更新 session 总题数和预估时间
 */
export async function handlePageCreated(
  event: FirestoreEvent<QueryDocumentSnapshot | undefined>
): Promise<void> {
  const snapshot = event.data;
  if (!snapshot) {
    logger.warn("No data in page document");
    return;
  }

  const { userId, sessionId, pageId } = event.params;
  const pageData = snapshot.data();
  const photoUrl = pageData.originalPhotoUrl as string;

  logger.info(`Processing page ${pageId} for session ${sessionId}`);

  try {
    // 1. 从 Cloud Storage 获取照片
    const bucket = getStorage().bucket();
    const storagePath = photoUrl.replace(/^gs:\/\/[^/]+\//, "");
    const [photoBuffer] = await bucket.file(storagePath).download();
    const photoBase64 = photoBuffer.toString("base64");

    // 2. 调用 Gemini 解析
    const result = await analyzeWithGemini(
      PAGE_PARSE_PROMPT,
      [{ mimeType: "image/jpeg", data: photoBase64 }]
    ) as ParseResult;

    logger.info(`Parsed ${result.questions.length} questions from page ${pageId}`);

    // 3. 写入 questions 子集合
    const db = getFirestore();
    const batch = db.batch();
    const questionsRef = db.collection(
      `users/${userId}/sessions/${sessionId}/questions`
    );

    let totalEstimatedMinutes = 0;

    for (const q of result.questions) {
      const questionDoc = questionsRef.doc();
      batch.set(questionDoc, {
        sessionId,
        pageId,
        questionIndex: q.index,
        label: q.label,
        type: q.type,
        estimatedMinutes: q.estimatedMinutes,
        status: "unanswered",
        statusUpdatedAt: FieldValue.serverTimestamp(),
        actualMinutes: null,
        boundingBox: q.boundingBox,
      });
      totalEstimatedMinutes += q.estimatedMinutes;
    }

    // 4. 更新 page 状态
    batch.update(snapshot.ref, {
      status: "parsed",
      subject: result.subject,
      questionsCount: result.questions.length,
    });

    // 5. 更新 session 总题数（增量）
    const sessionRef = db.doc(`users/${userId}/sessions/${sessionId}`);
    batch.update(sessionRef, {
      totalQuestions: FieldValue.increment(result.questions.length),
      totalEstimatedMinutes: FieldValue.increment(totalEstimatedMinutes),
    });

    await batch.commit();
    logger.info(`Successfully processed page ${pageId}: ${result.questions.length} questions`);

  } catch (error) {
    logger.error(`Error processing page ${pageId}:`, error);

    // 标记页面解析失败
    await snapshot.ref.update({ status: "error" });
  }
}
