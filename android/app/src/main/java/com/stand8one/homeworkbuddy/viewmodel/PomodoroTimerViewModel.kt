package com.stand8one.homeworkbuddy.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class PomodoroPhase {
    WORK, BREAK, IDLE
}

data class PomodoroState(
    val phase: PomodoroPhase = PomodoroPhase.IDLE,
    val remainingSeconds: Int = 0,
    val totalSeconds: Int = 0,
    val roundsCompleted: Int = 0,
    val workMinutes: Int = 20,
    val breakMinutes: Int = 5,
)

@HiltViewModel
class PomodoroTimerViewModel @Inject constructor() : ViewModel() {

    private val _state = MutableStateFlow(PomodoroState())
    val state: StateFlow<PomodoroState> = _state.asStateFlow()

    private var timerJob: Job? = null
    private var onWorkEnd: (() -> Unit)? = null
    private var onBreakEnd: (() -> Unit)? = null

    /**
     * 配置番茄钟参数
     */
    fun configure(workMinutes: Int = 20, breakMinutes: Int = 5) {
        _state.value = _state.value.copy(
            workMinutes = workMinutes,
            breakMinutes = breakMinutes,
        )
    }

    /**
     * 设置回调
     */
    fun setCallbacks(onWorkEnd: () -> Unit, onBreakEnd: () -> Unit) {
        this.onWorkEnd = onWorkEnd
        this.onBreakEnd = onBreakEnd
    }

    /**
     * 开始工作阶段
     */
    fun startWork() {
        val totalSeconds = _state.value.workMinutes * 60
        _state.value = _state.value.copy(
            phase = PomodoroPhase.WORK,
            remainingSeconds = totalSeconds,
            totalSeconds = totalSeconds,
        )
        startCountdown {
            // 工作阶段结束 → 进入休息
            onWorkEnd?.invoke()
            startBreak()
        }
    }

    /**
     * 开始休息阶段
     */
    private fun startBreak() {
        val totalSeconds = _state.value.breakMinutes * 60
        _state.value = _state.value.copy(
            phase = PomodoroPhase.BREAK,
            remainingSeconds = totalSeconds,
            totalSeconds = totalSeconds,
            roundsCompleted = _state.value.roundsCompleted + 1,
        )
        startCountdown {
            // 休息结束 → 下一轮工作
            onBreakEnd?.invoke()
            startWork()
        }
    }

    /**
     * 停止番茄钟
     */
    fun stop() {
        timerJob?.cancel()
        _state.value = _state.value.copy(
            phase = PomodoroPhase.IDLE,
            remainingSeconds = 0,
        )
    }

    private fun startCountdown(onComplete: () -> Unit) {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (_state.value.remainingSeconds > 0) {
                delay(1000)
                _state.value = _state.value.copy(
                    remainingSeconds = _state.value.remainingSeconds - 1
                )
            }
            onComplete()
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
