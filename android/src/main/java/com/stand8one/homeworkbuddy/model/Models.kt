package com.stand8one.homeworkbuddy.model

import com.google.firebase.Timestamp

/**
 * 作业 Session - 每日批次
 */
data class Session(
    val id: String = "",
    val userId: String = "",
    val date: String = "",                    // "2026-03-17"
    val status: SessionStatus = SessionStatus.CREATED,
    val startedAt: Timestamp? = null,
    val completedAt: Timestamp? = null,
    val totalQuestions: Int = 0,
    val completedQuestions: Int = 0,
    val totalEstimatedMinutes: Int = 0,
    val actualMinutes: Int? = null,
    val pomodoroCount: Int = 0,
    val efficiencyStars: Int? = null,
    val aheadOfPlan: Int = 0,
    val currentPageId: String? = null
)

enum class SessionStatus {
    CREATED, IN_PROGRESS, COMPLETED
}

/**
 * 作业页面
 */
data class Page(
    val id: String = "",
    val sessionId: String = "",
    val pageIndex: Int = 0,
    val subject: String? = null,
    val originalPhotoUrl: String = "",
    val thumbnailUrl: String? = null,
    val uploadedAt: Timestamp? = null,
    val questionsCount: Int = 0,
    val status: PageStatus = PageStatus.UPLOADING
)

enum class PageStatus {
    UPLOADING, PARSING, PARSED, ERROR
}

/**
 * 题目 - 最小追踪颗粒度
 */
data class Question(
    val id: String = "",
    val sessionId: String = "",
    val pageId: String = "",
    val questionIndex: Int = 0,
    val label: String = "",
    val type: QuestionType = QuestionType.OTHER,
    val estimatedMinutes: Int = 0,
    val status: QuestionStatus = QuestionStatus.UNANSWERED,
    val statusUpdatedAt: Timestamp? = null,
    val actualMinutes: Float? = null,
    val boundingBox: BoundingBox? = null
)

enum class QuestionType {
    FILL_BLANK, CHOICE, CALCULATION, WORD_PROBLEM, COPY, READING, OTHER
}

enum class QuestionStatus {
    UNANSWERED, IN_PROGRESS, COMPLETED
}

data class BoundingBox(
    val x: Float = 0f,
    val y: Float = 0f,
    val width: Float = 0f,
    val height: Float = 0f
)

/**
 * 采集记录
 */
data class Capture(
    val id: String = "",
    val sessionId: String = "",
    val capturedAt: Timestamp? = null,
    val photoUrl: String = "",
    val videoUrl: String? = null,
    val quality: CaptureQuality = CaptureQuality.GOOD,
    val analysisStatus: AnalysisStatus = AnalysisStatus.PENDING
)

enum class CaptureQuality {
    GOOD, BLURRY, OCCLUDED, ANGLE_SHIFTED
}

enum class AnalysisStatus {
    PENDING, PROCESSING, COMPLETED, SKIPPED, ERROR
}

/**
 * 用户设置
 */
data class UserSettings(
    val pomodoroWorkMinutes: Int = 20,
    val pomodoroBreakMinutes: Int = 5,
    val captureIntervalMinutes: Int = 3,
    val lagThresholdQuestions: Int = 3,
    val lagThresholdStallMinutes: Int = 10,
    val notifications: NotificationSettings = NotificationSettings()
)

data class NotificationSettings(
    val significantLag: Boolean = true,
    val sessionComplete: Boolean = true,
    val prolongedLeave: Boolean = true,
    val progressUpdate: Boolean = false
)
