package com.stand8one.homeworkbuddy.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stand8one.homeworkbuddy.model.Question
import com.stand8one.homeworkbuddy.model.Session
import com.stand8one.homeworkbuddy.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SessionUiState(
    val session: Session? = null,
    val questions: List<Question> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val sessionRepository: SessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SessionUiState())
    val uiState: StateFlow<SessionUiState> = _uiState.asStateFlow()

    private var currentUserId: String? = null

    /**
     * 开始监听指定用户的今日 session (最新一个)
     */
    fun observeSession(userId: String) {
        if (currentUserId == userId) return
        currentUserId = userId

        viewModelScope.launch {
            sessionRepository.observeTodaySession(userId).collect { session ->
                _uiState.value = _uiState.value.copy(
                    session = session,
                    loading = false
                )

                // 如果有 session，监听题目
                if (session != null) {
                    observeQuestions(userId, session.id)
                }
            }
        }
    }

    /**
     * 明确监听指定的 SESSION
     */
    fun observeSpecificSession(userId: String, sessionId: String) {
        viewModelScope.launch {
            sessionRepository.observeSpecificSession(userId, sessionId).collect { session ->
                _uiState.value = _uiState.value.copy(
                    session = session,
                    loading = false
                )
            }
        }
    }

    fun observeQuestions(userId: String, sessionId: String) {
        viewModelScope.launch {
            sessionRepository.observeQuestions(userId, sessionId).collect { questions ->
                _uiState.value = _uiState.value.copy(questions = questions)
            }
        }
    }

    /**
     * 创建新的 session
     */
    fun createSession(userId: String, onCreated: (String) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val sessionId = sessionRepository.createSession(userId)
                onCreated(sessionId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    /**
     * 开始作业（状态从 created → in_progress）
     */
    fun startSession(userId: String, sessionId: String, totalQuestions: Int = 0) {
        viewModelScope.launch {
            try {
                sessionRepository.startSession(userId, sessionId, totalQuestions)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    /**
     * 结束作业
     */
    fun completeSession(userId: String, sessionId: String) {
        viewModelScope.launch {
            try {
                sessionRepository.completeSession(userId, sessionId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    /**
     * 更新某道题目的状态（例如：作答完毕）
     */
    fun updateQuestionStatus(userId: String, sessionId: String, questionId: String, status: com.stand8one.homeworkbuddy.model.QuestionStatus) {
        viewModelScope.launch {
            try {
                sessionRepository.updateQuestionStatus(userId, sessionId, questionId, status)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    /**
     * 人工微调：删除识别错的冗余题目
     */
    fun deleteQuestion(userId: String, sessionId: String, questionId: String) {
        viewModelScope.launch {
            try {
                sessionRepository.deleteQuestion(userId, sessionId, questionId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    /**
     * 人工微调：修改预估时间 (+1 分钟 / -1 分钟)
     */
    fun updateQuestionEstimatedMinutes(userId: String, sessionId: String, questionId: String, deltaMinutes: Int) {
        viewModelScope.launch {
            try {
                sessionRepository.updateQuestionEstimatedMinutes(userId, sessionId, questionId, deltaMinutes)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
