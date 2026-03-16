import { getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

interface NotificationPayload {
  title: string;
  body: string;
  type: string;
}

/**
 * 发送推送通知给用户
 * 通过 FCM token 发送（token 由客户端注册时存入 Firestore）
 */
export async function sendNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const db = getFirestore();
    const userDoc = await db.doc(`users/${userId}`).get();
    const fcmTokens = userDoc.data()?.fcmTokens as string[] | undefined;

    if (!fcmTokens || fcmTokens.length === 0) {
      logger.warn(`No FCM tokens for user ${userId}`);
      return;
    }

    const messaging = getMessaging();

    await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
      },
      android: {
        priority: "high",
        notification: {
          sound: "gentle_chime",
          channelId: "homework_alerts",
        },
      },
      webpush: {
        notification: {
          icon: "/icons/notification-icon.png",
          badge: "/icons/badge-icon.png",
        },
      },
    });

    logger.info(`Notification sent to user ${userId}: ${payload.title}`);
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}:`, error);
  }
}
