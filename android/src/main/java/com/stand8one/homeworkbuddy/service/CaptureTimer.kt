package com.stand8one.homeworkbuddy.service

import android.content.Context
import android.os.Handler
import android.os.Looper

/**
 * 采集定时器
 * 管理番茄钟周期和定时拍照
 *
 * 时间线:
 * [专注 20min] → (每3min拍照) → [休息 5min] → [专注 20min] → ...
 */
class CaptureTimer(
    private val context: Context,
    private val onCapture: () -> Unit,
    private val onPomodoroEnd: (completedQuestions: Int) -> Unit,
    private val onPomodoroBreakEnd: () -> Unit,
    private val captureIntervalMs: Long = 3 * 60 * 1000L,      // 默认 3 分钟
    private val pomodoroWorkMs: Long = 20 * 60 * 1000L,         // 默认 20 分钟
    private val pomodoroBreakMs: Long = 5 * 60 * 1000L          // 默认 5 分钟
) {
    private val handler = Handler(Looper.getMainLooper())
    private var isRunning = false
    private var isBreak = false
    private var sessionStartTime = 0L
    private var pomodoroStartTime = 0L

    // 定时采集 Runnable
    private val captureRunnable = object : Runnable {
        override fun run() {
            if (!isRunning || isBreak) return
            onCapture()
            handler.postDelayed(this, captureIntervalMs)
        }
    }

    // 番茄钟工作结束 Runnable
    private val pomodoroEndRunnable = Runnable {
        if (!isRunning) return
        isBreak = true
        // TODO: 从 Firestore 获取实际完成题数
        onPomodoroEnd(0)
        // 休息结束后自动继续
        handler.postDelayed(breakEndRunnable, pomodoroBreakMs)
    }

    // 休息结束 Runnable
    private val breakEndRunnable = Runnable {
        if (!isRunning) return
        isBreak = false
        onPomodoroBreakEnd()
        startPomodoroRound()
    }

    fun start() {
        isRunning = true
        isBreak = false
        sessionStartTime = System.currentTimeMillis()

        // 立即执行第一次采集
        onCapture()

        // 启动定时采集
        handler.postDelayed(captureRunnable, captureIntervalMs)

        // 启动第一个番茄钟
        startPomodoroRound()
    }

    fun stop() {
        isRunning = false
        handler.removeCallbacksAndMessages(null)
    }

    private fun startPomodoroRound() {
        pomodoroStartTime = System.currentTimeMillis()
        // 设置番茄钟结束定时
        handler.postDelayed(pomodoroEndRunnable, pomodoroWorkMs)
        // 重新启动采集
        handler.postDelayed(captureRunnable, captureIntervalMs)
    }

    /**
     * 获取当前番茄钟剩余秒数
     */
    fun getRemainingSeconds(): Int {
        if (!isRunning) return 0
        val elapsed = System.currentTimeMillis() - pomodoroStartTime
        val total = if (isBreak) pomodoroBreakMs else pomodoroWorkMs
        val remaining = (total - elapsed) / 1000
        return remaining.toInt().coerceAtLeast(0)
    }

    fun isInBreak(): Boolean = isBreak
}
