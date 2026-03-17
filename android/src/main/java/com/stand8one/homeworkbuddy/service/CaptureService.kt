package com.stand8one.homeworkbuddy.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * 作业采集前台服务
 *
 * 保活策略（四层防护）：
 * 1. Foreground Service + 常驻通知 → 主力保活
 * 2. Partial WakeLock → 防 CPU 休眠
 * 3. 电池优化白名单 → 防系统杀进程
 * 4. WorkManager 兜底 → 被杀后自动恢复
 *
 * 除非用户主动结束，否则不会停止运行。
 */
class CaptureService : Service() {

    companion object {
        const val CHANNEL_ID = "homework_capture_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.stand8one.homeworkbuddy.START_CAPTURE"
        const val ACTION_STOP = "com.stand8one.homeworkbuddy.STOP_CAPTURE"
        private const val WAKELOCK_TAG = "HomeworkBuddy:CaptureService"
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var captureTimer: CaptureTimer? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startCapture()
            ACTION_STOP -> stopCapture()
        }
        // START_STICKY: 系统杀掉后会尝试重新创建服务
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * 启动采集
     */
    private fun startCapture() {
        // 1. 启动前台服务 + 通知
        val notification = buildNotification("作业助手运行中", "准备开始...")
        startForeground(NOTIFICATION_ID, notification)

        // 2. 获取 WakeLock，防止 CPU 休眠
        acquireWakeLock()

        // 3. 启动定时采集
        captureTimer = CaptureTimer(
            context = this,
            onCapture = { performCapture() },
            onPomodoroEnd = { completedQuestions -> onPomodoroRoundEnd(completedQuestions) },
            onPomodoroBreakEnd = { onBreakEnd() }
        )
        captureTimer?.start()
    }

    /**
     * 停止采集（仅用户主动触发）
     */
    private fun stopCapture() {
        captureTimer?.stop()
        captureTimer = null
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /**
     * 执行一次采集（拍照 + 录视频）
     */
    private fun performCapture() {
        // TODO: 调用 CameraService 拍照 + 录视频
        // TODO: 调用 ImageQualityChecker 检查质量
        // TODO: 通过 UploadWorker 上传到 Cloud Storage
        // TODO: 写入 Firestore capture 记录

        updateNotification("作业助手运行中", "上次采集: ${getCurrentTime()}")
    }

    /**
     * 番茄钟一轮结束 → TTS 播报
     */
    private fun onPomodoroRoundEnd(completedQuestions: Int) {
        // TODO: 用 TextToSpeech 轻声播报
        // "这一轮你完成了 X 题，太棒了！休息一下吧"
        updateNotification("☕ 休息时间", "这一轮完成了 $completedQuestions 题")
    }

    /**
     * 休息结束 → 轻提示音
     */
    private fun onBreakEnd() {
        // TODO: 播放轻提示音
        updateNotification("🍅 专注时间", "继续加油！")
    }

    // ==============================
    // WakeLock 管理
    // ==============================

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            WAKELOCK_TAG
        ).apply {
            // 最长 3 小时，超时自动释放防止泄漏
            acquire(3 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        wakeLock = null
    }

    // ==============================
    // 通知管理
    // ==============================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "作业采集服务",
                NotificationManager.IMPORTANCE_LOW  // 低重要性，不发声
            ).apply {
                description = "作业期间保持后台运行"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, content: String): Notification {
        // 点击通知打开 App
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 停止按钮
        val stopIntent = Intent(this, CaptureService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_camera)  // TODO: 替换为自定义图标
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "结束", stopPendingIntent)
            .setOngoing(true)  // 不可滑动删除
            .setSilent(true)   // 静默，不发声
            .build()
    }

    private fun updateNotification(title: String, content: String) {
        val notification = buildNotification(title, content)
        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun getCurrentTime(): String {
        return java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            .format(java.util.Date())
    }

    // ==============================
    // 系统杀进程后的恢复
    // ==============================

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // App 被从最近任务列表划掉时，服务仍保持运行
        // START_STICKY 会让系统尝试重建
    }

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
        captureTimer?.stop()
    }
}
