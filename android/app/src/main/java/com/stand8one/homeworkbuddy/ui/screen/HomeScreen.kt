package com.stand8one.homeworkbuddy.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stand8one.homeworkbuddy.model.SessionStatus
import com.stand8one.homeworkbuddy.ui.components.ProgressRaceBar
import com.stand8one.homeworkbuddy.viewmodel.AuthState
import com.stand8one.homeworkbuddy.viewmodel.AuthViewModel
import com.stand8one.homeworkbuddy.viewmodel.SessionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToCapture: () -> Unit,
    onNavigateToSession: (String) -> Unit,
    onNavigateToHistory: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val sessionState by sessionViewModel.uiState.collectAsStateWithLifecycle()

    val userId = (authState as? AuthState.Authenticated)?.user?.uid

    // 开始监听
    LaunchedEffect(userId) {
        userId?.let { sessionViewModel.observeSession(it) }
    }

    val session = sessionState.session

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("📚 作业成长助手") },
                actions = {
                    IconButton(onClick = onNavigateToHistory) {
                        Icon(Icons.Default.History, "历史")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // 今日日期
            Text(
                text = java.text.SimpleDateFormat("yyyy年M月d日 EEEE", java.util.Locale.CHINESE)
                    .format(java.util.Date()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (sessionState.loading) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (session == null) {
                // 今天没有 session
                NoSessionCard(onStart = onNavigateToCapture)
            } else when (session.status) {
                SessionStatus.CREATED, SessionStatus.IN_PROGRESS -> {
                    // 有进行中的 session
                    ActiveSessionCard(
                        completedQuestions = session.completedQuestions,
                        totalQuestions = session.totalQuestions,
                        aheadOfPlan = session.aheadOfPlan,
                        onContinue = { onNavigateToSession(session.id) },
                    )
                }
                SessionStatus.COMPLETED -> {
                    // 今天已完成
                    CompletedSessionCard(
                        totalQuestions = session.totalQuestions,
                        actualMinutes = session.actualMinutes,
                        stars = session.efficiencyStars,
                    )
                }
            }
        }
    }
}

@Composable
private fun NoSessionCard(onStart: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(
            modifier = Modifier.padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("📝", fontSize = 48.sp)
            Spacer(Modifier.height(12.dp))
            Text(
                "今天还没有开始写作业",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onStart,
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Icon(Icons.Default.CameraAlt, null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("开始今日作业", fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun ActiveSessionCard(
    completedQuestions: Int,
    totalQuestions: Int,
    aheadOfPlan: Int,
    onContinue: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text("作业进行中", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            ProgressRaceBar(
                totalQuestions = totalQuestions,
                completedQuestions = completedQuestions,
                expectedCompleted = completedQuestions - aheadOfPlan,
                aheadOfPlan = aheadOfPlan,
            )

            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text("继续作业")
            }
        }
    }
}

@Composable
private fun CompletedSessionCard(
    totalQuestions: Int,
    actualMinutes: Int?,
    stars: Int?,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(
            modifier = Modifier.padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("🎉", fontSize = 48.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "今日作业全部完成！",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "共 $totalQuestions 题" + (actualMinutes?.let { "，用时 ${it} 分钟" } ?: ""),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (stars != null && stars > 0) {
                Spacer(Modifier.height(12.dp))
                Text("⭐".repeat(stars), fontSize = 28.sp)
            }
        }
    }
}
