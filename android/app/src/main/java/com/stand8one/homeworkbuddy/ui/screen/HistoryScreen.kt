package com.stand8one.homeworkbuddy.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.stand8one.homeworkbuddy.ui.theme.*
import com.stand8one.homeworkbuddy.viewmodel.AuthState
import com.stand8one.homeworkbuddy.viewmodel.AuthViewModel

data class SessionSummary(
    val id: String,
    val date: String,
    val status: String,
    val totalQuestions: Int,
    val completedQuestions: Int,
    val actualMinutes: Int?,
    val efficiencyStars: Int?,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onNavigateBack: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val userId = (authState as? AuthState.Authenticated)?.user?.uid

    var sessions by remember { mutableStateOf<List<SessionSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(userId) {
        if (userId == null) return@LaunchedEffect

        val db = FirebaseFirestore.getInstance()
        db.collection("users/$userId/sessions")
            .orderBy("startedAt", Query.Direction.DESCENDING)
            .limit(30)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot == null) return@addSnapshotListener
                sessions = snapshot.documents.map { doc ->
                    SessionSummary(
                        id = doc.id,
                        date = doc.getString("date") ?: "",
                        status = doc.getString("status") ?: "",
                        totalQuestions = doc.getLong("totalQuestions")?.toInt() ?: 0,
                        completedQuestions = doc.getLong("completedQuestions")?.toInt() ?: 0,
                        actualMinutes = doc.getLong("actualMinutes")?.toInt(),
                        efficiencyStars = doc.getLong("efficiencyStars")?.toInt(),
                    )
                }
                loading = false
            }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("历史记录") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                }
            )
        }
    ) { padding ->
        if (loading) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else if (sessions.isEmpty()) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text("还没有作业记录", color = TextSecondary, fontSize = 16.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 16.dp),
            ) {
                items(sessions) { session ->
                    SessionHistoryCard(session)
                }
            }
        }
    }
}

@Composable
private fun SessionHistoryCard(session: SessionSummary) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = DarkCard,
        ),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    session.date,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "${session.completedQuestions}/${session.totalQuestions} 题" +
                            (session.actualMinutes?.let { " · ${it}分钟" } ?: ""),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    when (session.status) {
                        "completed" -> "✅ 已完成"
                        "in_progress" -> "🔄 进行中"
                        else -> "📝 已创建"
                    },
                    fontSize = 13.sp,
                    color = when (session.status) {
                        "completed" -> Teal400
                        "in_progress" -> Blue400
                        else -> TextSecondary
                    },
                )
                session.efficiencyStars?.let { stars ->
                    Spacer(Modifier.height(4.dp))
                    Text("⭐".repeat(stars), fontSize = 14.sp)
                }
            }
        }
    }
}
