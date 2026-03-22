package com.stand8one.homeworkbuddy.service

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * 保活守护工具
 *
 * 提供：
 * 1. 电池优化白名单引导
 * 2. WorkManager 兜底定时检查
 * 3. 服务状态检测与恢复
 */
object KeepAliveHelper {

    private const val WATCHDOG_WORK_NAME = "capture_watchdog"

    /**
     * 检查是否已忽略电池优化
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * 引导用户关闭电池优化
     * 注意：这个 Intent 在部分厂商 ROM 上可能无效，需要适配
     */
    fun requestIgnoreBatteryOptimizations(context: Context) {
        if (isIgnoringBatteryOptimizations(context)) return

        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    /**
     * 注册 WorkManager 守护任务
     * 每 15 分钟检查一次服务是否存活，如果被杀则重启
     */
    fun registerWatchdog(context: Context) {
        val request = PeriodicWorkRequestBuilder<WatchdogWorker>(
            15, TimeUnit.MINUTES  // WorkManager 最短间隔 15 分钟
        ).setConstraints(
            Constraints.Builder()
                .setRequiresBatteryNotLow(false)  // 低电量也要运行
                .build()
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WATCHDOG_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    /**
     * 取消守护任务
     */
    fun cancelWatchdog(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WATCHDOG_WORK_NAME)
    }

    /**
     * 启动前台服务
     */
    fun startCaptureService(context: Context) {
        val intent = Intent(context, CaptureService::class.java).apply {
            action = CaptureService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    /**
     * 停止前台服务
     */
    fun stopCaptureService(context: Context) {
        val intent = Intent(context, CaptureService::class.java).apply {
            action = CaptureService.ACTION_STOP
        }
        context.startService(intent)
        cancelWatchdog(context)
    }
}

/**
 * 守护 Worker
 * 定期检查 CaptureService 是否存活，被系统杀掉时自动重启
 */
class WatchdogWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        // 检查服务是否在运行
        if (!isServiceRunning()) {
            // 服务被杀了，重新启动
            KeepAliveHelper.startCaptureService(applicationContext)
        }
        return Result.success()
    }

    private fun isServiceRunning(): Boolean {
        val manager = applicationContext.getSystemService(Context.ACTIVITY_SERVICE)
                as android.app.ActivityManager
        @Suppress("DEPRECATION")
        for (service in manager.getRunningServices(Int.MAX_VALUE)) {
            if (CaptureService::class.java.name == service.service.className) {
                return true
            }
        }
        return false
    }
}
