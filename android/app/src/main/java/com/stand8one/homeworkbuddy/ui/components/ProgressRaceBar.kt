package com.stand8one.homeworkbuddy.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stand8one.homeworkbuddy.ui.theme.*

/**
 * 双轨进度赛跑条
 * 上方: 预估计划线（匀速推进）
 * 下方: 实际进度线（根据领先/同步/落后变色）
 */
@Composable
fun ProgressRaceBar(
    totalQuestions: Int,
    completedQuestions: Int,
    expectedCompleted: Int,
    aheadOfPlan: Int,
    modifier: Modifier = Modifier,
) {
    val planPercent = if (totalQuestions > 0) expectedCompleted.toFloat() / totalQuestions else 0f
    val actualPercent = if (totalQuestions > 0) completedQuestions.toFloat() / totalQuestions else 0f

    val isAhead = aheadOfPlan > 0
    val isOnTrack = aheadOfPlan in -1..0

    val actualGradient = when {
        isAhead -> Brush.horizontalGradient(listOf(Teal500, Teal400))
        isOnTrack -> Brush.horizontalGradient(listOf(Blue400, Blue400))
        else -> Brush.horizontalGradient(listOf(Orange400, Orange400))
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // 计划线
        TrackRow(
            label = "📋 计划",
            percent = planPercent,
            gradient = Brush.horizontalGradient(
                listOf(TextSecondary.copy(alpha = 0.6f), TextSecondary.copy(alpha = 0.8f))
            ),
            valueText = "$expectedCompleted/$totalQuestions",
        )

        // 实际线
        TrackRow(
            label = "✏️ 实际",
            percent = actualPercent,
            gradient = actualGradient,
            valueText = "$completedQuestions/$totalQuestions",
        )

        // 差值 badge
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(
                    when {
                        isAhead -> Teal400.copy(alpha = 0.15f)
                        isOnTrack -> Blue400.copy(alpha = 0.15f)
                        else -> Orange400.copy(alpha = 0.15f)
                    }
                )
                .padding(vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = when {
                    isAhead -> "🎉 领先 $aheadOfPlan 题"
                    isOnTrack -> "👍 进度同步"
                    else -> "💪 落后 ${kotlin.math.abs(aheadOfPlan)} 题"
                },
                fontSize = 14.sp,
                color = when {
                    isAhead -> Teal400
                    isOnTrack -> Blue400
                    else -> Orange400
                },
            )
        }
    }
}

@Composable
private fun TrackRow(
    label: String,
    percent: Float,
    gradient: Brush,
    valueText: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            label,
            fontSize = 13.sp,
            color = TextSecondary,
            modifier = Modifier.width(56.dp),
        )

        Box(
            modifier = Modifier
                .weight(1f)
                .height(12.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.surface),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(percent.coerceIn(0f, 1f))
                    .clip(RoundedCornerShape(6.dp))
                    .background(gradient),
            )
        }

        Text(
            valueText,
            fontSize = 13.sp,
            color = TextPrimary,
            modifier = Modifier.width(48.dp),
        )
    }
}
