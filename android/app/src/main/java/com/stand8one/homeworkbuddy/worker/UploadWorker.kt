package com.stand8one.homeworkbuddy.worker

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.stand8one.homeworkbuddy.data.local.AppDatabase
import com.stand8one.homeworkbuddy.data.local.PendingUpload
import com.stand8one.homeworkbuddy.repository.CaptureRepository
import com.stand8one.homeworkbuddy.repository.PageRepository
import java.io.File

/**
 * 离线上传 Worker
 *
 * 由 WorkManager 在网络恢复时自动触发
 * 按 capturedAt 时间顺序依次上传缓存的拍照/采集数据
 *
 * spec §5.3: "网络恢复后按时间顺序补传"
 */
class UploadWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    companion object {
        const val TAG = "UploadWorker"
        const val WORK_NAME = "pending_uploads"
    }

    override suspend fun doWork(): Result {
        val db = AppDatabase.getInstance(applicationContext)
        val dao = db.pendingUploadDao()

        // 先重试之前失败的
        dao.retryFailed(maxRetries = 3)

        val pendingUploads = dao.getPendingUploads()
        if (pendingUploads.isEmpty()) {
            Log.i(TAG, "No pending uploads")
            return Result.success()
        }

        Log.i(TAG, "Processing ${pendingUploads.size} pending uploads")

        var successCount = 0
        var failCount = 0

        for (upload in pendingUploads) {
            dao.markUploading(upload.id)
            try {
                processUpload(upload)
                dao.markCompleted(upload.id)
                // 删除本地临时文件
                cleanupLocalFiles(upload)
                successCount++
            } catch (e: Exception) {
                Log.e(TAG, "Upload failed for ${upload.id}: ${e.message}", e)
                dao.markFailed(upload.id, e.message ?: "Unknown error")
                failCount++
            }
        }

        Log.i(TAG, "Upload complete: $successCount success, $failCount failed")

        // 清理已完成的记录
        dao.clearCompleted()

        return if (failCount > 0) Result.retry() else Result.success()
    }

    private suspend fun processUpload(upload: PendingUpload) {
        val photoBytes = File(upload.localPhotoPath).readBytes()
        val videoBytes = upload.localVideoPath?.let { File(it).readBytes() }

        when (upload.type) {
            "capture" -> {
                // 使用 Hilt 提供的 CaptureRepository
                // 注意：Worker 与 Hilt 的集成需要 @HiltWorker 注解
                // 这里简化为直接构造 — 实际需通过 HiltWorkerFactory
                throw UnsupportedOperationException(
                    "Use @HiltWorker for DI injection of CaptureRepository"
                )
            }
            "page" -> {
                throw UnsupportedOperationException(
                    "Use @HiltWorker for DI injection of PageRepository"
                )
            }
            else -> {
                Log.w(TAG, "Unknown upload type: ${upload.type}")
            }
        }
    }

    private fun cleanupLocalFiles(upload: PendingUpload) {
        try {
            File(upload.localPhotoPath).delete()
            upload.localVideoPath?.let { File(it).delete() }
        } catch (e: Exception) {
            Log.w(TAG, "Cleanup failed for ${upload.id}", e)
        }
    }
}
