import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

const RETENTION_DAYS = 30;

/**
 * 定时清理 Cloud Storage 中超过 30 天的采集文件
 * 每天运行一次
 *
 * 清理逻辑：
 * 1. 遍历所有用户的 captures 和 pages
 * 2. 检查 capturedAt/createdAt 时间
 * 3. 超过 RETENTION_DAYS 的删除 Storage 文件
 * 4. 更新 Firestore 记录标记为 "cleaned"
 */
export const scheduledCleanup = onSchedule("every 24 hours", async (event) => {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  logger.info(`Starting cleanup for files older than ${cutoffDate.toISOString()}`);

  let deletedCount = 0;
  let errorCount = 0;

  try {
    // 获取所有用户
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;

      // 获取所有已完成的 sessions
      const sessionsSnap = await db
        .collection(`users/${userId}/sessions`)
        .where("status", "==", "completed")
        .get();

      for (const sessionDoc of sessionsSnap.docs) {
        const sessionId = sessionDoc.id;

        // 清理 captures
        const capturesSnap = await db
          .collection(`users/${userId}/sessions/${sessionId}/captures`)
          .where("capturedAt", "<", cutoffDate)
          .get();

        for (const captureDoc of capturesSnap.docs) {
          const data = captureDoc.data();
          try {
            // 删除照片
            if (data.photoUrl) {
              const photoPath = (data.photoUrl as string).replace(/^gs:\/\/[^/]+\//, "");
              await bucket.file(photoPath).delete().catch(() => {});
            }
            // 删除视频
            if (data.videoUrl) {
              const videoPath = (data.videoUrl as string).replace(/^gs:\/\/[^/]+\//, "");
              await bucket.file(videoPath).delete().catch(() => {});
            }
            // 标记为已清理
            await captureDoc.ref.update({ storageCleaned: true });
            deletedCount++;
          } catch (err) {
            errorCount++;
            logger.warn(`Failed to clean capture ${captureDoc.id}:`, err);
          }
        }

        // 清理 pages（保留更长时间 — 页面照片用于后续对比）
        // 仅当 session 超过 90 天才清理页面照片
        const pageCutoff = new Date();
        pageCutoff.setDate(pageCutoff.getDate() - 90);
        const sessionCreatedAt = sessionDoc.data().createdAt?.toDate?.();

        if (sessionCreatedAt && sessionCreatedAt < pageCutoff) {
          const pagesSnap = await db
            .collection(`users/${userId}/sessions/${sessionId}/pages`)
            .get();

          for (const pageDoc of pagesSnap.docs) {
            const pageData = pageDoc.data();
            try {
              if (pageData.originalPhotoUrl) {
                const path = (pageData.originalPhotoUrl as string).replace(/^gs:\/\/[^/]+\//, "");
                await bucket.file(path).delete().catch(() => {});
              }
              await pageDoc.ref.update({ storageCleaned: true });
              deletedCount++;
            } catch (err) {
              errorCount++;
            }
          }
        }
      }
    }

    logger.info(`Cleanup complete: ${deletedCount} files cleaned, ${errorCount} errors`);
  } catch (error) {
    logger.error("Scheduled cleanup failed:", error);
  }
});
