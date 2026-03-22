package com.stand8one.homeworkbuddy.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 离线队列实体
 * 网络中断时缓存拍照数据，恢复后由 UploadWorker 按时间顺序自动补传
 * spec §5.3 + tech §5
 */
@Entity(tableName = "pending_uploads")
data class PendingUpload(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /** 上传类型：page 或 capture */
    val type: String, // "page" | "capture"

    val userId: String,
    val sessionId: String,

    /** 本地照片文件路径 */
    val localPhotoPath: String,

    /** 本地视频文件路径（可选） */
    val localVideoPath: String? = null,

    /** 页面索引（仅 type=page 时使用） */
    val pageIndex: Int? = null,

    /** 图像质量评估 */
    val quality: String = "good",

    /** 采集时间（用于排序补传顺序） */
    val capturedAt: Long = System.currentTimeMillis(),

    /** 上传状态 */
    val status: String = "pending", // pending | uploading | completed | failed

    /** 重试次数 */
    val retryCount: Int = 0,

    /** 最后一次错误信息 */
    val lastError: String? = null,
)
