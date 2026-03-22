package com.stand8one.homeworkbuddy.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.stand8one.homeworkbuddy.model.Question
import com.stand8one.homeworkbuddy.model.QuestionStatus
import com.stand8one.homeworkbuddy.model.QuestionType
import com.stand8one.homeworkbuddy.model.Session
import com.stand8one.homeworkbuddy.model.SessionStatus
import com.stand8one.homeworkbuddy.model.BoundingBox
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionRepository @Inject constructor(
    private val db: FirebaseFirestore
) {
    /**
     * 创建今日 Session
     */
    suspend fun createSession(userId: String): String {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val sessionData = hashMapOf(
            "userId" to userId,
            "date" to today,
            "status" to "created",
            "startedAt" to Timestamp.now(),
            "completedAt" to null,
            "totalQuestions" to 0,
            "completedQuestions" to 0,
            "totalEstimatedMinutes" to 0,
            "actualMinutes" to null,
            "pomodoroCount" to 0,
            "efficiencyStars" to null,
            "aheadOfPlan" to 0,
            "currentPageId" to null,
        )
        val docRef = db.collection("users/$userId/sessions").add(sessionData).await()
        return docRef.id
    }

    /**
     * 将 session 状态更新为 in_progress
     */
    suspend fun startSession(userId: String, sessionId: String, totalQuestions: Int = 0) {
        val updates = mutableMapOf<String, Any>(
            "status" to "in_progress",
            "startedAt" to Timestamp.now(),
        )
        if (totalQuestions > 0) {
            updates["totalQuestions"] = totalQuestions
        }
        db.document("users/$userId/sessions/$sessionId")
            .update(updates).await()
    }

    /**
     * 将 session 标记为 completed
     */
    suspend fun completeSession(userId: String, sessionId: String) {
        db.document("users/$userId/sessions/$sessionId")
            .update(
                "status", "completed",
                "completedAt", Timestamp.now()
            ).await()
    }

    /**
     * 实时监听今日 Session
     */
    fun observeTodaySession(userId: String): Flow<Session?> = callbackFlow {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val query = db.collection("users/$userId/sessions")
            .whereEqualTo("date", today)
            .orderBy("startedAt", Query.Direction.DESCENDING)
            .limit(1)

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                trySend(null)
                return@addSnapshotListener
            }
            if (snapshot == null || snapshot.isEmpty) {
                trySend(null)
                return@addSnapshotListener
            }
            val doc = snapshot.documents[0]
            val session = Session(
                id = doc.id,
                userId = doc.getString("userId") ?: "",
                date = doc.getString("date") ?: "",
                status = when (doc.getString("status")) {
                    "in_progress" -> SessionStatus.IN_PROGRESS
                    "completed" -> SessionStatus.COMPLETED
                    else -> SessionStatus.CREATED
                },
                startedAt = doc.getTimestamp("startedAt"),
                completedAt = doc.getTimestamp("completedAt"),
                totalQuestions = doc.getLong("totalQuestions")?.toInt() ?: 0,
                completedQuestions = doc.getLong("completedQuestions")?.toInt() ?: 0,
                totalEstimatedMinutes = doc.getLong("totalEstimatedMinutes")?.toInt() ?: 0,
                actualMinutes = doc.getLong("actualMinutes")?.toInt(),
                pomodoroCount = doc.getLong("pomodoroCount")?.toInt() ?: 0,
                efficiencyStars = doc.getLong("efficiencyStars")?.toInt(),
                aheadOfPlan = doc.getLong("aheadOfPlan")?.toInt() ?: 0,
                currentPageId = doc.getString("currentPageId"),
            )
            trySend(session)
        }
        awaitClose { listener.remove() }
    }

    /**
     * 实时监听指定 ID 的 Session
     */
    fun observeSpecificSession(userId: String, sessionId: String): Flow<Session?> = callbackFlow {
        val listener = db.document("users/$userId/sessions/$sessionId").addSnapshotListener { doc, error ->
            if (error != null) {
                android.util.Log.e("SessionRepository", "listen error", error)
                trySend(null)
                return@addSnapshotListener
            }
            if (doc == null || !doc.exists()) {
                trySend(null)
                return@addSnapshotListener
            }
            val session = Session(
                id = doc.id,
                userId = doc.getString("userId") ?: "",
                date = doc.getString("date") ?: "",
                status = when (doc.getString("status")) {
                    "in_progress" -> SessionStatus.IN_PROGRESS
                    "completed" -> SessionStatus.COMPLETED
                    else -> SessionStatus.CREATED
                },
                startedAt = doc.getTimestamp("startedAt"),
                completedAt = doc.getTimestamp("completedAt"),
                totalQuestions = doc.getLong("totalQuestions")?.toInt() ?: 0,
                completedQuestions = doc.getLong("completedQuestions")?.toInt() ?: 0,
                totalEstimatedMinutes = doc.getLong("totalEstimatedMinutes")?.toInt() ?: 0,
                actualMinutes = doc.getLong("actualMinutes")?.toInt(),
                pomodoroCount = doc.getLong("pomodoroCount")?.toInt() ?: 0,
                efficiencyStars = doc.getLong("efficiencyStars")?.toInt(),
                aheadOfPlan = doc.getLong("aheadOfPlan")?.toInt() ?: 0,
                currentPageId = doc.getString("currentPageId"),
            )
            android.util.Log.d("SessionRepository", "observeSpecificSession emitted: totalQuestions=${session.totalQuestions}")
            trySend(session)
        }
        awaitClose { listener.remove() }
    }

    /**
     * 更新题目状态并在必要时增加 session 的 completedQuestions
     */
    suspend fun updateQuestionStatus(
        userId: String,
        sessionId: String,
        questionId: String,
        newStatus: QuestionStatus
    ) {
        val qRef = db.document("users/$userId/sessions/$sessionId/questions/$questionId")
        
        // 我们需要用事务或者简单的 runTransaction 保证总做题数一致，或者用云函数。
        // 这里为了简单和快速响应，直接客户端更新。如果状态是 COMPLETE，则让 session completedQuestions +1
        db.runTransaction { transaction ->
            val snapshot = transaction.get(qRef)
            val oldStatusStr = snapshot.getString("status")

            val newStatusStr = when (newStatus) {
                QuestionStatus.IN_PROGRESS -> "in_progress"
                QuestionStatus.COMPLETED -> "completed"
                else -> "unanswered"
            }

            transaction.update(
                qRef,
                "status", newStatusStr,
                "statusUpdatedAt", Timestamp.now()
            )

            // 如果原本不是完成，现在是完成，则 session 完成数 +1
            if (oldStatusStr != "completed" && newStatusStr == "completed") {
                val sRef = db.document("users/$userId/sessions/$sessionId")
                transaction.update(sRef, "completedQuestions", com.google.firebase.firestore.FieldValue.increment(1))
            }
            // 如果原本是完成，现在不是完成，则 session 完成数 -1
            if (oldStatusStr == "completed" && newStatusStr != "completed") {
                val sRef = db.document("users/$userId/sessions/$sessionId")
                transaction.update(sRef, "completedQuestions", com.google.firebase.firestore.FieldValue.increment(-1))
            }
        }.await()
    }

    /**
     * 更新题目预估时间，并同步更新 session 的总预估时间
     */
    suspend fun updateQuestionEstimatedMinutes(
        userId: String,
        sessionId: String,
        questionId: String,
        deltaMinutes: Int
    ) {
        if (deltaMinutes == 0) return
        
        val qRef = db.document("users/$userId/sessions/$sessionId/questions/$questionId")
        val sRef = db.document("users/$userId/sessions/$sessionId")
        
        db.runTransaction { transaction ->
            transaction.update(qRef, "estimatedMinutes", com.google.firebase.firestore.FieldValue.increment(deltaMinutes.toLong()))
            transaction.update(sRef, "totalEstimatedMinutes", com.google.firebase.firestore.FieldValue.increment(deltaMinutes.toLong()))
        }.await()
    }

    /**
     * 删除识别错的多余题目，同步扣除 session 的总题数和预估时间
     */
    suspend fun deleteQuestion(
        userId: String,
        sessionId: String,
        questionId: String
    ) {
        val qRef = db.document("users/$userId/sessions/$sessionId/questions/$questionId")
        val sRef = db.document("users/$userId/sessions/$sessionId")

        db.runTransaction { transaction ->
            val snapshot = transaction.get(qRef)
            val estMinutes = snapshot.getLong("estimatedMinutes") ?: 0L
            val qStatus = snapshot.getString("status")

            // 删除该题
            transaction.delete(qRef)

            // Session 表中扣除该题数和估时
            transaction.update(sRef, "totalQuestions", com.google.firebase.firestore.FieldValue.increment(-1L))
            transaction.update(sRef, "totalEstimatedMinutes", com.google.firebase.firestore.FieldValue.increment(-estMinutes))
            
            // 如果已经被完成了，还要把完成数 -1
            if (qStatus == "completed") {
                transaction.update(sRef, "completedQuestions", com.google.firebase.firestore.FieldValue.increment(-1L))
            }
        }.await()
    }

    /**
     * 实时监听 session 下的所有题目
     */
    fun observeQuestions(userId: String, sessionId: String): Flow<List<Question>> = callbackFlow {
        val query = db.collection("users/$userId/sessions/$sessionId/questions")
            .orderBy("questionIndex")

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null || snapshot == null) {
                trySend(emptyList())
                return@addSnapshotListener
            }
            val questions = snapshot.documents.map { doc ->
                Question(
                    id = doc.id,
                    sessionId = doc.getString("sessionId") ?: "",
                    pageId = doc.getString("pageId") ?: "",
                    questionIndex = doc.getLong("questionIndex")?.toInt() ?: 0,
                    label = doc.getString("label") ?: "",
                    content = doc.getString("content") ?: "",
                    type = try {
                        QuestionType.valueOf(
                            (doc.getString("type") ?: "other").uppercase()
                        )
                    } catch (_: Exception) { QuestionType.OTHER },
                    estimatedMinutes = doc.getLong("estimatedMinutes")?.toInt() ?: 0,
                    status = when (doc.getString("status")) {
                        "in_progress" -> QuestionStatus.IN_PROGRESS
                        "completed" -> QuestionStatus.COMPLETED
                        else -> QuestionStatus.UNANSWERED
                    },
                    statusUpdatedAt = doc.getTimestamp("statusUpdatedAt"),
                    actualMinutes = doc.getDouble("actualMinutes")?.toFloat(),
                    boundingBox = doc.get("boundingBox")?.let { bb ->
                        @Suppress("UNCHECKED_CAST")
                        val map = bb as? Map<String, Any>
                        if (map != null) BoundingBox(
                            x = (map["x"] as? Number)?.toFloat() ?: 0f,
                            y = (map["y"] as? Number)?.toFloat() ?: 0f,
                            width = (map["width"] as? Number)?.toFloat() ?: 0f,
                            height = (map["height"] as? Number)?.toFloat() ?: 0f,
                        ) else null
                    }
                )
            }
            trySend(questions)
        }
        awaitClose { listener.remove() }
    }
}
