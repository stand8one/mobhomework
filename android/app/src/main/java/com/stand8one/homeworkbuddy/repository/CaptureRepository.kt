package com.stand8one.homeworkbuddy.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CaptureRepository @Inject constructor(
    private val db: FirebaseFirestore,
    private val mediaRepository: MediaRepository
) {
    /**
     * 创建一次采集记录：上传照片+视频 → 写入 Firestore
     * @return captureId
     */
    suspend fun createCapture(
        userId: String,
        sessionId: String,
        photoBytes: ByteArray,
        videoBytes: ByteArray?,
        quality: String = "good"
    ): String {
        val captureId = mediaRepository.generateCaptureId()

        // 1. 上传照片
        val photoUrl = mediaRepository.uploadPhoto(userId, sessionId, captureId, photoBytes)

        // 2. 上传视频（如有）
        val videoUrl = if (videoBytes != null) {
            mediaRepository.uploadVideo(userId, sessionId, captureId, videoBytes)
        } else null

        // 3. 写入 Firestore capture 记录
        val captureData = hashMapOf(
            "sessionId" to sessionId,
            "capturedAt" to Timestamp.now(),
            "photoUrl" to photoUrl,
            "videoUrl" to videoUrl,
            "photoBytesSize" to photoBytes.size,
            "videoDurationSeconds" to if (videoBytes != null) 5 else null,
            "quality" to quality,
            "analysisStatus" to "pending",
        )
        db.document("users/$userId/sessions/$sessionId/captures/$captureId")
            .set(captureData)
            .await()

        return captureId
    }
}
