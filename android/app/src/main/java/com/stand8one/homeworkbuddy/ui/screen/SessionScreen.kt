package com.stand8one.homeworkbuddy.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stand8one.homeworkbuddy.model.Question
import com.stand8one.homeworkbuddy.model.QuestionStatus
import com.stand8one.homeworkbuddy.model.SessionStatus
import com.stand8one.homeworkbuddy.ui.components.PomodoroTimerDisplay
import com.stand8one.homeworkbuddy.ui.components.ProgressRaceBar
import com.stand8one.homeworkbuddy.ui.theme.*
import com.stand8one.homeworkbuddy.viewmodel.AuthState
import com.stand8one.homeworkbuddy.viewmodel.AuthViewModel
import com.stand8one.homeworkbuddy.viewmodel.PomodoroTimerViewModel
import com.stand8one.homeworkbuddy.viewmodel.SessionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionScreen(
    sessionId: String,
    onNavigateBack: () -> Unit,
    isExpanded: Boolean = false,
    authViewModel: AuthViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel(),
    pomodoroViewModel: PomodoroTimerViewModel = hiltViewModel(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val sessionState by sessionViewModel.uiState.collectAsStateWithLifecycle()
    val pomodoroState by pomodoroViewModel.state.collectAsStateWithLifecycle()

    val userId = (authState as? AuthState.Authenticated)?.user?.uid ?: return
    val session = sessionState.session
    val questions = sessionState.questions

    LaunchedEffect(userId, sessionId) {
        sessionViewModel.observeSpecificSession(userId, sessionId)
        sessionViewModel.observeQuestions(userId, sessionId)
    }

    LaunchedEffect(Unit) {
        pomodoroViewModel.startWork()
    }

    val completedCount = questions.count { it.status == QuestionStatus.COMPLETED }
    val inProgressCount = questions.count { it.status == QuestionStatus.IN_PROGRESS }
    val totalCount = session?.totalQuestions ?: questions.size
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while(true) {
            kotlinx.coroutines.delay(1000)
            now = System.currentTimeMillis()
        }
    }

    val sessionStartedAt = session?.startedAt?.toDate()?.time ?: now
    val elapsedMinutes = ((now - sessionStartedAt) / 60000f).coerceAtLeast(0f)
    val totalEstMinutes = session?.totalEstimatedMinutes?.takeIf { it > 0 } ?: (totalCount * 2) // default 2 min per q

    val expectedCompleted = if (totalEstMinutes > 0) {
        (elapsedMinutes / totalEstMinutes * totalCount).toInt().coerceIn(0, totalCount)
    } else 0

    val aheadOfPlan = completedCount - expectedCompleted

    val feedbackText = when {
        aheadOfPlan > 0 -> "太棒了，你比计划快了 $aheadOfPlan 题！🎉"
        aheadOfPlan >= -1 -> "节奏很好，继续保持 👍"
        aheadOfPlan >= -3 -> "加把劲，还差 ${kotlin.math.abs(aheadOfPlan)} 题追上计划 💪"
        else -> "休息一下再继续吧，你已经很棒了 ❤️"
    }

    val feedbackColor = when {
        aheadOfPlan > 0 -> Teal400
        aheadOfPlan >= -1 -> Blue400
        else -> Orange400
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("作业进行中") })
        }
    ) { padding ->
        if (isExpanded) {
            // 折叠屏展开 / 大屏：左右分栏
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                // 左栏：番茄钟 + 完成数
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    PomodoroTimerDisplay(
                        phase = pomodoroState.phase,
                        remainingSeconds = pomodoroState.remainingSeconds,
                        totalSeconds = pomodoroState.totalSeconds,
                        roundsCompleted = pomodoroState.roundsCompleted,
                    )

                    CompletionCounter(completedCount, totalCount)

                    FeedbackCard(feedbackText, feedbackColor)
                }

                // 右栏：进度条 + 控制按钮
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    if (totalCount > 0) {
                        ProgressRaceBar(
                            totalQuestions = totalCount,
                            completedQuestions = completedCount,
                            expectedCompleted = expectedCompleted,
                            aheadOfPlan = aheadOfPlan,
                        )
                    }

                    if (inProgressCount > 0) {
                        Text("正在做: $inProgressCount 道题", fontSize = 14.sp, color = TextSecondary)
                    }

                    QuestionsList(questions, userId, sessionId, sessionViewModel, pomodoroViewModel)

                    Spacer(Modifier.weight(1f))

                    SessionControls(
                        session = session,
                        userId = userId,
                        sessionId = sessionId,
                        sessionViewModel = sessionViewModel,
                        pomodoroViewModel = pomodoroViewModel,
                        onNavigateBack = onNavigateBack,
                    )
                }
            }
        } else {
            // 普通手机：单列滚动
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                PomodoroTimerDisplay(
                    phase = pomodoroState.phase,
                    remainingSeconds = pomodoroState.remainingSeconds,
                    totalSeconds = pomodoroState.totalSeconds,
                    roundsCompleted = pomodoroState.roundsCompleted,
                )

                CompletionCounter(completedCount, totalCount)

                if (totalCount > 0) {
                    ProgressRaceBar(
                        totalQuestions = totalCount,
                        completedQuestions = completedCount,
                        expectedCompleted = expectedCompleted,
                        aheadOfPlan = aheadOfPlan,
                    )
                }

                FeedbackCard(feedbackText, feedbackColor)

                if (inProgressCount > 0) {
                    Text("正在做: $inProgressCount 道题", fontSize = 14.sp, color = TextSecondary)
                }

                QuestionsList(questions, userId, sessionId, sessionViewModel, pomodoroViewModel)

                Spacer(Modifier.weight(1f))

                SessionControls(
                    session = session,
                    userId = userId,
                    sessionId = sessionId,
                    sessionViewModel = sessionViewModel,
                    pomodoroViewModel = pomodoroViewModel,
                    onNavigateBack = onNavigateBack,
                )
            }
        }
    }
}

@Composable
private fun CompletionCounter(completedCount: Int, totalCount: Int) {
    Row(
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            "$completedCount",
            fontSize = 56.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Teal400,
        )
        Text("/ $totalCount", fontSize = 24.sp, color = TextSecondary)
        Text("题", fontSize = 20.sp, color = TextSecondary, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
private fun FeedbackCard(text: String, color: androidx.compose.ui.graphics.Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.12f)),
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
        )
    }
}

@Composable
private fun SessionControls(
    session: com.stand8one.homeworkbuddy.model.Session?,
    userId: String,
    sessionId: String,
    sessionViewModel: SessionViewModel,
    pomodoroViewModel: PomodoroTimerViewModel,
    onNavigateBack: () -> Unit,
) {
    if (session?.status == SessionStatus.IN_PROGRESS) {
        OutlinedButton(
            onClick = {
                sessionViewModel.completeSession(userId, sessionId)
                pomodoroViewModel.stop()
                onNavigateBack()
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Red400),
        ) {
            Icon(Icons.Default.Stop, null, Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("结束作业")
        }
    }

    if (session?.status == SessionStatus.COMPLETED) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Teal400.copy(alpha = 0.12f)),
        ) {
            Column(
                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("🎉", fontSize = 48.sp)
                Spacer(Modifier.height(8.dp))
                Text("全部完成！", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Teal400)
                session.efficiencyStars?.let { stars ->
                    Spacer(Modifier.height(8.dp))
                    Text("⭐".repeat(stars), fontSize = 28.sp)
                }
            }
        }
    }
}

@Composable
private fun QuestionsList(
    questions: List<Question>,
    userId: String,
    sessionId: String,
    sessionViewModel: SessionViewModel,
    pomodoroViewModel: PomodoroTimerViewModel
) {
    if (questions.isEmpty()) return
    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
    ) {
        Text("AI识别题目 (${questions.size})", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        for (q in questions) {
            val isCompleted = q.status == com.stand8one.homeworkbuddy.model.QuestionStatus.COMPLETED
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isCompleted) Teal400.copy(alpha=0.1f) else MaterialTheme.colorScheme.surfaceVariant
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("题目 ${q.questionIndex}", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(4.dp))
                        Text(q.content.ifEmpty { q.label }.ifEmpty { "（无识别文本）" }, fontSize = 14.sp)
                    }
                    Spacer(Modifier.width(16.dp))
                    Button(
                        onClick = {
                            val nextStatus = if (isCompleted) com.stand8one.homeworkbuddy.model.QuestionStatus.UNANSWERED else com.stand8one.homeworkbuddy.model.QuestionStatus.COMPLETED
                            sessionViewModel.updateQuestionStatus(userId, sessionId, q.id, nextStatus)
                            if (nextStatus == com.stand8one.homeworkbuddy.model.QuestionStatus.COMPLETED) {
                                // 切换到下一个番茄钟 / 重置番茄钟给下一题
                                pomodoroViewModel.startWork()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isCompleted) Color.Gray else Teal400
                        )
                    ) {
                        Text(if (isCompleted) "撤销" else "完成", color = Color.White)
                    }
                }
            }
        }
    }
}
