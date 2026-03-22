package com.stand8one.homeworkbuddy.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.FirebaseAuth
import com.stand8one.homeworkbuddy.repository.CaptureRepository
import com.stand8one.homeworkbuddy.repository.SessionRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.util.Locale
import java.util.concurrent.Executors
import javax.inject.Inject

/**
 * 作业采集前台服务
 *
 * 保活策略（四层防护）：
 * 1. Foreground Service + 常驻通知 → 主力保活
 * 2. Partial WakeLock → 防 CPU 休眠
 * 3. 电池优化白名单 → 防系统杀进程
 * 4. WorkManager 兜底 → 被杀后自动恢复
 *
 * 核心采集流程：
 * CameraX 拍照 → ImageQualityChecker → CaptureRepository → Cloud Functions
 */
@AndroidEntryPoint
class CaptureService : Service() {

    companion object {
        const val CHANNEL_ID = "homework_capture_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.stand8one.homeworkbuddy.START_CAPTURE"
        const val ACTION_STOP = "com.stand8one.homeworkbuddy.STOP_CAPTURE"
        const val EXTRA_SESSION_ID = "session_id"
        private const val WAKELOCK_TAG = "HomeworkBuddy:CaptureService"
        private const val TAG = "CaptureService"
    }

    @Inject lateinit var captureRepository: CaptureRepository
    @Inject lateinit var sessionRepository: SessionRepository

    private var wakeLock: PowerManager.WakeLock? = null
    private var captureTimer: CaptureTimer? = null
    private var imageCapture: ImageCapture? = null
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var currentSessionId: String? = null

    // TTS 用于番茄钟播报
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    // 休息结束提示音
    private var breakEndPlayer: MediaPlayer? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        initTts()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                currentSessionId = intent.getStringExtra(EXTRA_SESSION_ID)
                startCapture()
            }
            ACTION_STOP -> stopCapture()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ==============================
    // TTS 初始化
    // ==============================

    private fun initTts() {
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.CHINESE
                tts?.setSpeechRate(0.9f) // 稍慢，让孩子听清
                ttsReady = true
            }
        }
    }

    private fun speak(text: String) {
        if (ttsReady) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "homework_tts")
        }
    }

    // ==============================
    // 采集控制
    // ==============================

    private fun startCapture() {
        val notification = buildNotification("作业助手运行中", "准备开始...")
        startForeground(NOTIFICATION_ID, notification)
        acquireWakeLock()
        setupCamera()

        captureTimer = CaptureTimer(
            context = this,
            onCapture = { performCapture() },
            onPomodoroEnd = { completedQuestions -> onPomodoroRoundEnd(completedQuestions) },
            onPomodoroBreakEnd = { onBreakEnd() }
        )
        captureTimer?.start()
    }

    private fun stopCapture() {
        captureTimer?.stop()
        captureTimer = null
        releaseWakeLock()
        releaseCamera()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ==============================
    // CameraX 设置
    // ==============================

    private fun setupCamera() {
        imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
    }

    private fun releaseCamera() {
        cameraExecutor.shutdown()
        imageCapture = null
    }

    // ==============================
    // 核心采集逻辑
    // ==============================

    /**
     * 执行一次采集（拍照 → 质量检查 → 上传 → 写 Firestore）
     */
    private fun performCapture() {
        val capture = imageCapture ?: return
        val sessionId = currentSessionId ?: return
        val userId = FirebaseAuth.getInstance().currentUser?.uid ?: return

        capture.takePicture(
            cameraExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    serviceScope.launch {
                        try {
                            val bitmap = image.toBitmap()
                            image.close()

                            // 1. 质量检查
                            val quality = checkImageQuality(bitmap)

                            // 2. 转换为 JPEG bytes
                            val photoBytes = bitmapToJpegBytes(bitmap, 85)

                            // 3. 上传并写入 Firestore（触发 Cloud Function）
                            val captureId = captureRepository.createCapture(
                                userId = userId,
                                sessionId = sessionId,
                                photoBytes = photoBytes,
                                videoBytes = null, // 视频采集后续版本支持
                                quality = quality
                            )

                            Log.i(TAG, "Capture $captureId uploaded, quality=$quality")
                            updateNotification(
                                "作业助手运行中",
                                "上次采集: ${getCurrentTime()} · $quality"
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Capture failed", e)
                            updateNotification("作业助手运行中", "采集失败，将在下次重试")
                        }
                    }
                }

                override fun onError(e: ImageCaptureException) {
                    Log.e(TAG, "Camera capture error", e)
                }
            }
        )
    }

    /**
     * 图像质量检查
     */
    private fun checkImageQuality(bitmap: Bitmap): String {
        return when {
            ImageQualityChecker.isBlurry(bitmap) -> "blurry"
            ImageQualityChecker.isOccluded(bitmap) -> "occluded"
            else -> "good"
        }
    }

    /**
     * Bitmap → JPEG ByteArray
     */
    private fun bitmapToJpegBytes(bitmap: Bitmap, quality: Int): ByteArray {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
        return stream.toByteArray()
    }

    // ==============================
    // 番茄钟回调
    // ==============================

    /**
     * 番茄钟一轮结束 → TTS 温柔播报
     */
    private fun onPomodoroRoundEnd(completedQuestions: Int) {
        if (completedQuestions > 0) {
            speak("这一轮你完成了${completedQuestions}题，太棒了！休息一下吧。")
        } else {
            speak("写了一段时间了，休息一下吧。")
        }
        updateNotification("☕ 休息时间", "这一轮完成了 $completedQuestions 题")
    }

    /**
     * 休息结束 → 轻提示音 + TTS
     */
    private fun onBreakEnd() {
        // 播放轻提示音
        try {
            breakEndPlayer?.release()
            breakEndPlayer = MediaPlayer.create(this, android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
            breakEndPlayer?.setVolume(0.3f, 0.3f) // 低音量
            breakEndPlayer?.start()
            breakEndPlayer?.setOnCompletionListener { it.release() }
        } catch (e: Exception) {
            Log.w(TAG, "Break end sound failed", e)
        }
        speak("休息结束啦，继续加油！")
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
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "作业期间保持后台运行"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, content: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

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
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "结束", stopPendingIntent)
            .setOngoing(true)
            .setSilent(true)
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
    // 生命周期
    // ==============================

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        releaseWakeLock()
        captureTimer?.stop()
        tts?.shutdown()
        breakEndPlayer?.release()
        releaseCamera()
    }
}

