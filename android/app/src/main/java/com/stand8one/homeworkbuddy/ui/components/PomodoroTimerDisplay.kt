package com.stand8one.homeworkbuddy.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stand8one.homeworkbuddy.ui.theme.*
import com.stand8one.homeworkbuddy.viewmodel.PomodoroPhase

/**
 * 番茄钟环形倒计时组件
 */
@Composable
fun PomodoroTimerDisplay(
    phase: PomodoroPhase,
    remainingSeconds: Int,
    totalSeconds: Int,
    roundsCompleted: Int,
    modifier: Modifier = Modifier,
) {
    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val progress = if (totalSeconds > 0) remainingSeconds.toFloat() / totalSeconds else 0f

    val ringColor = when (phase) {
        PomodoroPhase.WORK -> Teal400
        PomodoroPhase.BREAK -> Blue400
        PomodoroPhase.IDLE -> TextSecondary
    }

    val bgColor = MaterialTheme.colorScheme.surface

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // 环形进度
        Box(
            modifier = Modifier.size(160.dp),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.fillMaxSize()) {
                val strokeWidth = 10.dp.toPx()
                val padding = strokeWidth / 2
                val arcSize = Size(size.width - strokeWidth, size.height - strokeWidth)

                // 背景环
                drawArc(
                    color = bgColor,
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = Offset(padding, padding),
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
                )

                // 进度环
                drawArc(
                    color = ringColor,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    topLeft = Offset(padding, padding),
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = String.format("%02d:%02d", minutes, seconds),
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
                Text(
                    text = when (phase) {
                        PomodoroPhase.WORK -> "🍅 专注中"
                        PomodoroPhase.BREAK -> "☕ 休息中"
                        PomodoroPhase.IDLE -> "待开始"
                    },
                    fontSize = 14.sp,
                    color = ringColor,
                )
            }
        }

        // 轮次
        if (roundsCompleted > 0) {
            Text(
                "已完成 $roundsCompleted 轮",
                fontSize = 13.sp,
                color = TextSecondary,
            )
        }
    }
}
