package com.stand8one.homeworkbuddy.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * 离线上传队列 DAO
 */
@Dao
interface PendingUploadDao {

    @Insert
    suspend fun insert(upload: PendingUpload): Long

    @Update
    suspend fun update(upload: PendingUpload)

    /**
     * 获取所有等待上传的记录，按采集时间排序
     * 保证补传顺序与拍照顺序一致
     */
    @Query("SELECT * FROM pending_uploads WHERE status = 'pending' ORDER BY capturedAt ASC")
    suspend fun getPendingUploads(): List<PendingUpload>

    /**
     * 实时监听待上传数量
     */
    @Query("SELECT COUNT(*) FROM pending_uploads WHERE status = 'pending'")
    fun pendingCountFlow(): Flow<Int>

    /**
     * 标记为上传中
     */
    @Query("UPDATE pending_uploads SET status = 'uploading' WHERE id = :id")
    suspend fun markUploading(id: Long)

    /**
     * 标记为完成
     */
    @Query("UPDATE pending_uploads SET status = 'completed' WHERE id = :id")
    suspend fun markCompleted(id: Long)

    /**
     * 标记为失败 + 增加重试次数
     */
    @Query("UPDATE pending_uploads SET status = 'failed', retryCount = retryCount + 1, lastError = :error WHERE id = :id")
    suspend fun markFailed(id: Long, error: String)

    /**
     * 重试失败的上传（重置状态为 pending）
     */
    @Query("UPDATE pending_uploads SET status = 'pending' WHERE status = 'failed' AND retryCount < :maxRetries")
    suspend fun retryFailed(maxRetries: Int = 3)

    /**
     * 清理已完成的记录
     */
    @Query("DELETE FROM pending_uploads WHERE status = 'completed'")
    suspend fun clearCompleted()
}
