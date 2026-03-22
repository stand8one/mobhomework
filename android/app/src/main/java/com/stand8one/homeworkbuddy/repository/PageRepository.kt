package com.stand8one.homeworkbuddy.repository

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PageRepository @Inject constructor(
    private val db: FirebaseFirestore,
    private val mediaRepository: MediaRepository
) {
    /**
     * 创建作业页面记录 + 上传照片
     * @return pageId
     */
    suspend fun createPage(
        userId: String,
        sessionId: String,
        pageIndex: Int,
        photoBytes: ByteArray
    ): String {
        return try {
            val pageId = mediaRepository.generatePageId()
            Log.d("PageRepository", "Creating page with ID: $pageId for session $sessionId")

            // 1. 上传照片到 Storage
            Log.d("PageRepository", "Starting storage upload for $pageId...")
            val photoUrl = mediaRepository.uploadPagePhoto(userId, sessionId, pageId, photoBytes)
            Log.d("PageRepository", "Storage upload success. URL: $photoUrl")

            // 2. 写入 Firestore
            Log.d("PageRepository", "Writing to Firestore...")
            val pageData = hashMapOf(
                "sessionId" to sessionId,
                "pageIndex" to pageIndex,
                "subject" to null,
                "originalPhotoUrl" to photoUrl,
                "thumbnailUrl" to null,
                "uploadedAt" to Timestamp.now(),
                "questionsCount" to 0,
                "status" to "uploading",
            )
            db.document("users/$userId/sessions/$sessionId/pages/$pageId")
                .set(pageData)
                .await()
            Log.d("PageRepository", "Firestore write success for page $pageId")

            pageId
        } catch (e: Exception) {
            Log.e("PageRepository", "Error creating page: ${e.message}", e)
            throw e
        }
    }
}
