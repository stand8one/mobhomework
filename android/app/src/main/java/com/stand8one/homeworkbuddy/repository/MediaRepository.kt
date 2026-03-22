package com.stand8one.homeworkbuddy.repository

import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaRepository @Inject constructor(
    private val storage: FirebaseStorage
) {
    /**
     * 上传照片到 Cloud Storage
     * @return gs:// URL
     */
    suspend fun uploadPhoto(
        userId: String,
        sessionId: String,
        captureId: String,
        photoBytes: ByteArray
    ): String {
        val path = "users/$userId/sessions/$sessionId/captures/$captureId/photo.jpg"
        val ref = storage.reference.child(path)
        ref.putBytes(photoBytes).await()
        return "gs://${storage.reference.bucket}/$path"
    }

    /**
     * 上传视频到 Cloud Storage
     * @return gs:// URL
     */
    suspend fun uploadVideo(
        userId: String,
        sessionId: String,
        captureId: String,
        videoBytes: ByteArray
    ): String {
        val path = "users/$userId/sessions/$sessionId/captures/$captureId/video.mp4"
        val ref = storage.reference.child(path)
        ref.putBytes(videoBytes).await()
        return "gs://${storage.reference.bucket}/$path"
    }

    /**
     * 上传作业页照片
     * @return gs:// URL
     */
    suspend fun uploadPagePhoto(
        userId: String,
        sessionId: String,
        pageId: String,
        photoBytes: ByteArray
    ): String {
        val path = "users/$userId/sessions/$sessionId/pages/$pageId/original.jpg"
        val ref = storage.reference.child(path)
        ref.putBytes(photoBytes).await()
        return "gs://${storage.reference.bucket}/$path"
    }

    /**
     * 生成唯一的 captureId
     */
    fun generateCaptureId(): String = UUID.randomUUID().toString()

    /**
     * 生成唯一的 pageId
     */
    fun generatePageId(): String = UUID.randomUUID().toString()
}
