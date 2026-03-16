import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/app/../firestore";
import { getStorage } from "firebase-admin/storage";
import { analyzeWithGemini } from "./gemini/client";
import { buildProgressPrompt } from "./gemini/prompts";
import { sendNotification } from "./notifications";
import { logger } from "firebase-functions";

interface QuestionProgress {
  questionId: string;
  newStatus: "unanswered" | "in_progress" | "completed";
  confidence: number;
}

interface ProgressResult {
  matchedPageId: string | null;
  questionsProgress: QuestionProgress[];
  anomalies: string[];
  sceneDescription: string;
}

/**
 * 当新的采集记录被创建时触发
 * 1. 检查图像质量，如遮挡/模糊则跳过
 * 2. 获取当前各题状态
 * 3. 调用 Gemini 分析进度变化
 * 4. 更新题目状态和 session 进度
 * 5. 判断进度差值，决定是否推送通知
 */
export async function handleCaptureCreated(
  event: FirestoreEvent<QueryDocumentSnapshot | undefined>
): Promise<void> {
  const snapshot = event.data;
  if (!snapshot) return;

  const { userId, sessionId, captureId } = event.params;
  const captureData = snapshot.data();

  // 1. 检查质量，跳过低质量帧
  if (captureData.quality === "occluded" || captureData.quality === "blurry") {
    logger.info(`Skipping capture ${captureId}: quality=${captureData.quality}`);
    await snapshot.ref.update({ analysisStatus: "skipped" });
    return;
  }

  logger.info(`Processing capture ${captureId} for session ${sessionId}`);

  try {
    const db = getFirestore();
    const bucket = getStorage().bucket();

    // 2. 获取当前所有题目状态
    const questionsSnap = await db
      .collection(`users/${userId}/sessions/${sessionId}/questions`)
      .get();

    const questionsStatus: Record<string, string> = {};
    questionsSnap.docs.forEach((doc) => {
      questionsStatus[doc.id] = doc.data().status;
    });

    // 3. 获取照片和视频
    const images: { mimeType: string; data: string }[] = [];

    // 获取初始页面照片（参考基准）
    const pagesSnap = await db
      .collection(`users/${userId}/sessions/${sessionId}/pages`)
      .get();

    for (const pageDoc of pagesSnap.docs) {
      const pagePhoto = pageDoc.data().originalPhotoUrl as string;
      if (pagePhoto) {
        const filePath = pagePhoto.replace(/^gs:\/\/[^/]+\//, "");
        const [buffer] = await bucket.file(filePath).download();
        images.push({ mimeType: "image/jpeg", data: buffer.toString("base64") });
      }
    }

    // 获取当前采集照片
    const capturePhotoPath = (captureData.photoUrl as string).replace(/^gs:\/\/[^/]+\//, "");
    const [captureBuffer] = await bucket.file(capturePhotoPath).download();
    images.push({ mimeType: "image/jpeg", data: captureBuffer.toString("base64") });

    // 获取视频（如有）
    let video: { mimeType: string; data: string } | undefined;
    if (captureData.videoUrl) {
      const videoPath = (captureData.videoUrl as string).replace(/^gs:\/\/[^/]+\//, "");
      const [videoBuffer] = await bucket.file(videoPath).download();
      video = { mimeType: "video/mp4", data: videoBuffer.toString("base64") };
    }

    // 4. 调用 Gemini 分析
    const prompt = buildProgressPrompt(questionsStatus);
    await snapshot.ref.update({ analysisStatus: "processing" });

    const result = await analyzeWithGemini(prompt, images, video) as ProgressResult;

    // 5. 更新题目状态
    const batch = db.batch();
    let completedDelta = 0;

    for (const progress of result.questionsProgress) {
      if (progress.confidence < 0.5) continue; // 低置信度不更新

      const questionRef = db.doc(
        `users/${userId}/sessions/${sessionId}/questions/${progress.questionId}`
      );
      const prevStatus = questionsStatus[progress.questionId];

      if (prevStatus !== progress.newStatus) {
        batch.update(questionRef, {
          status: progress.newStatus,
          statusUpdatedAt: FieldValue.serverTimestamp(),
        });

        if (progress.newStatus === "completed" && prevStatus !== "completed") {
          completedDelta++;
        }
      }
    }

    // 6. 计算进度对比
    const sessionRef = db.doc(`users/${userId}/sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    const sessionData = sessionSnap.data()!;

    const totalQuestions = sessionData.totalQuestions as number;
    const currentCompleted = (sessionData.completedQuestions as number) + completedDelta;
    const startedAt = (sessionData.startedAt as FirebaseFirestore.Timestamp).toDate();
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000;
    const totalEstimated = sessionData.totalEstimatedMinutes as number;

    // 按匀速计算预期完成数
    const expectedCompleted = Math.min(
      totalQuestions,
      Math.round((elapsedMinutes / totalEstimated) * totalQuestions)
    );
    const delta = currentCompleted - expectedCompleted;

    // 判断进度状态
    let planStatus: string;
    if (delta > 0) planStatus = "ahead";
    else if (delta >= -1) planStatus = "on_track";
    else if (delta >= -3) planStatus = "slightly_behind";
    else planStatus = "significantly_behind";

    // 7. 写入分析结果
    const analysisRef = db.collection(
      `users/${userId}/sessions/${sessionId}/analyses`
    ).doc();

    batch.set(analysisRef, {
      captureId,
      sessionId,
      analyzedAt: FieldValue.serverTimestamp(),
      matchedPageId: result.matchedPageId,
      questionsProgress: result.questionsProgress,
      overallProgress: {
        completed: currentCompleted,
        inProgress: Object.values(questionsStatus).filter((s) => s === "in_progress").length,
        unanswered: totalQuestions - currentCompleted,
        total: totalQuestions,
      },
      planComparison: {
        expectedCompleted,
        actualCompleted: currentCompleted,
        delta,
        status: planStatus,
      },
      anomalies: result.anomalies,
      sceneDescription: result.sceneDescription,
      geminiModelUsed: "gemini-2.0-flash",
    });

    // 8. 更新 session
    batch.update(sessionRef, {
      completedQuestions: currentCompleted,
      aheadOfPlan: delta,
    });

    // 9. 更新 capture 状态
    batch.update(snapshot.ref, { analysisStatus: "completed" });

    await batch.commit();

    // 10. 生成反馈消息
    const feedbackToChild = generateChildFeedback(planStatus, delta);

    // 11. 判断是否需要通知家长
    const userSnap = await db.doc(`users/${userId}`).get();
    const settings = userSnap.data()?.settings;

    if (planStatus === "significantly_behind" && settings?.notifications?.significantLag) {
      await sendNotification(userId, {
        title: "⚠️ 作业进度提醒",
        body: `${sessionData.childName || "孩子"}作业进度落后较多，已停滞较长时间`,
        type: "significant_lag",
      });

      // 记录事件
      const eventRef = db.collection(
        `users/${userId}/sessions/${sessionId}/events`
      ).doc();
      batch.set(eventRef, {
        sessionId,
        type: "anomaly",
        subType: "significant_lag",
        timestamp: FieldValue.serverTimestamp(),
        message: `进度落后 ${Math.abs(delta)} 题`,
        notifiedParent: true,
        notifiedChild: true,
      });
    }

    // 记录异常事件
    for (const anomaly of result.anomalies) {
      if (anomaly === "left_desk" && settings?.notifications?.prolongedLeave) {
        await sendNotification(userId, {
          title: "📝 作业状态",
          body: `${sessionData.childName || "孩子"}已离开作业区域`,
          type: "prolonged_leave",
        });
      }
    }

    logger.info(
      `Capture ${captureId} analyzed: ${currentCompleted}/${totalQuestions} completed, ` +
      `plan status: ${planStatus}, delta: ${delta}`
    );

  } catch (error) {
    logger.error(`Error processing capture ${captureId}:`, error);
    await snapshot.ref.update({ analysisStatus: "error" });
  }
}

/**
 * 生成给孩子的反馈消息
 */
function generateChildFeedback(planStatus: string, delta: number): string {
  switch (planStatus) {
    case "ahead":
      return `太棒了，你比计划快了 ${delta} 题！继续保持 🎉`;
    case "on_track":
      return "节奏很好，继续保持 👍";
    case "slightly_behind":
      return `加把劲，还差 ${Math.abs(delta)} 题追上计划 💪`;
    case "significantly_behind":
      return "休息一下再继续吧，你已经很棒了 ❤️";
    default:
      return "继续加油！";
  }
}
