package com.stand8one.homeworkbuddy.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stand8one.homeworkbuddy.ui.theme.Teal400
import com.stand8one.homeworkbuddy.viewmodel.AuthState
import com.stand8one.homeworkbuddy.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val error by authViewModel.error.collectAsStateWithLifecycle()

    LaunchedEffect(authState) {
        if (authState is AuthState.Authenticated) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.padding(32.dp),
        ) {
            Text("📚", fontSize = 64.sp)
            Text(
                "作业成长助手",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Teal400,
            )

            when (authState) {
                is AuthState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(32.dp),
                        color = Teal400,
                    )
                    Text("正在准备...", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                is AuthState.Unauthenticated -> {
                    error?.let { msg ->
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer,
                            ),
                        ) {
                            Text(
                                msg,
                                modifier = Modifier.padding(16.dp),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center,
                            )
                        }
                        Button(onClick = { authViewModel.retry() }) {
                            Text("重试")
                        }
                    }
                }
                else -> {}
            }
        }
    }
}
