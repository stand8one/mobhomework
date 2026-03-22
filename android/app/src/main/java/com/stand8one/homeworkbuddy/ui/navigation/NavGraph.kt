package com.stand8one.homeworkbuddy.ui.navigation

import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.stand8one.homeworkbuddy.ui.screen.*

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val CAPTURE = "capture"
    const val CAPTURE_WITH_SESSION = "capture/{sessionId}"
    const val SESSION = "session/{sessionId}"
    const val HISTORY = "history"
}

@Composable
fun NavGraph(
    navController: NavHostController,
    windowWidthSizeClass: WindowWidthSizeClass = WindowWidthSizeClass.Compact,
) {
    NavHost(navController = navController, startDestination = Routes.LOGIN) {

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HOME) {
            HomeScreen(
                onNavigateToCapture = {
                    navController.navigate(Routes.CAPTURE)
                },
                onNavigateToSession = { sessionId ->
                    navController.navigate("session/$sessionId")
                },
                onNavigateToHistory = {
                    navController.navigate(Routes.HISTORY)
                },
            )
        }

        composable(Routes.CAPTURE) {
            CaptureScreen(
                sessionId = null,
                onNavigateBack = { navController.popBackStack() },
                onStartSession = { sessionId ->
                    navController.navigate("session/$sessionId") {
                        popUpTo(Routes.HOME)
                    }
                },
                isExpanded = windowWidthSizeClass != WindowWidthSizeClass.Compact,
            )
        }

        composable(
            Routes.SESSION,
            arguments = listOf(navArgument("sessionId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getString("sessionId") ?: return@composable
            SessionScreen(
                sessionId = sessionId,
                onNavigateBack = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                },
                isExpanded = windowWidthSizeClass != WindowWidthSizeClass.Compact,
            )
        }

        composable(Routes.HISTORY) {
            HistoryScreen(
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
}
