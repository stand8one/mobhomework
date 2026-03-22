package com.stand8one.homeworkbuddy.service

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.util.Log

/**
 * Firebase Cloud Messaging 推送服务
 * 接收 Cloud Functions 发来的通知
 */
class HomeworkFCMService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d("FCM", "Message from: ${remoteMessage.from}")

        // 通知已通过 FCM 自动显示（notification payload）
        // data payload 可在此处理
        remoteMessage.data.let { data ->
            val type = data["type"]
            Log.d("FCM", "Notification type: $type")
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("FCM", "New FCM token: $token")
        // TODO: 将 token 保存到 Firestore users/{userId}/fcmTokens
    }
}
