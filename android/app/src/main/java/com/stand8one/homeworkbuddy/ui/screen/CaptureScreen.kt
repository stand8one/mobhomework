package com.stand8one.homeworkbuddy.ui.screen

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.stand8one.homeworkbuddy.viewmodel.AuthState
import com.stand8one.homeworkbuddy.viewmodel.AuthViewModel
import com.stand8one.homeworkbuddy.viewmodel.CaptureViewModel
import com.stand8one.homeworkbuddy.viewmodel.SessionViewModel
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptureScreen(
    sessionId: String?,
    onNavigateBack: () -> Unit,
    onStartSession: (String) -> Unit,
    isExpanded: Boolean = false,
    authViewModel: AuthViewModel = hiltViewModel(),
    sessionViewModel: SessionViewModel = hiltViewModel(),
    captureViewModel: CaptureViewModel = hiltViewModel(),
) {
    val authState by authViewModel.authState.collectAsStateWithLifecycle()
    val captureState by captureViewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val userId = (authState as? AuthState.Authenticated)?.user?.uid ?: return

    // 权限状态
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    // 首次进入请求权限
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // Session 初始化 + 实时监听
    var currentSessionId by remember { mutableStateOf(sessionId) }
    val sessionState by sessionViewModel.uiState.collectAsStateWithLifecycle()
    val detectedQuestions = sessionState.session?.totalQuestions ?: 0

    LaunchedEffect(Unit) {
        if (currentSessionId == null) {
            sessionViewModel.createSession(userId) { newId ->
                currentSessionId = newId
                captureViewModel.setSessionId(newId)
            }
        } else {
            captureViewModel.setSessionId(currentSessionId!!)
        }
    }

    // 开始监听 session（获取 Cloud Functions 分析结果）
    LaunchedEffect(currentSessionId) {
        currentSessionId?.let { sid ->
            sessionViewModel.observeSpecificSession(userId, sid)
            sessionViewModel.observeQuestions(userId, sid)
        }
    }

    // 分析超时计时（拍照后 30 秒没结果则提示手动输入）
    var waitingForAnalysis by remember { mutableStateOf(false) }
    var analysisTimedOut by remember { mutableStateOf(false) }

    LaunchedEffect(waitingForAnalysis, detectedQuestions) {
        if (waitingForAnalysis && detectedQuestions > 0) {
            // 识别到了，停止等待
            waitingForAnalysis = false
            analysisTimedOut = false
        }
    }

    LaunchedEffect(waitingForAnalysis) {
        if (waitingForAnalysis) {
            kotlinx.coroutines.delay(60_000) // 充裕的60秒超时，等待Cloud Function冷启动
            if (waitingForAnalysis) {
                analysisTimedOut = true
            }
        }
    }

    // 拍完第一张后开始等待分析
    LaunchedEffect(captureState.pages.size) {
        if (captureState.pages.isNotEmpty() && detectedQuestions == 0) {
            waitingForAnalysis = true
        }
    }

    // CameraX setup
    val imageCapture = remember { ImageCapture.Builder().build() }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    // 对话框状态
    var showReviewSheet by remember { mutableStateOf(false) }
    var showQuestionDialog by remember { mutableStateOf(false) }
    var questionCountText by remember { mutableStateOf("") }

    // 确认题目数量对话框
    if (showQuestionDialog) {
        AlertDialog(
            onDismissRequest = { showQuestionDialog = false },
            title = {
                Text(
                    if (detectedQuestions > 0) "确认题目数量"
                    else "请输入题目数量"
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (detectedQuestions > 0) {
                        Text(
                            "AI 识别到 $detectedQuestions 道题，可以直接开始或手动调整",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Text(
                            "AI 未能识别题目数量，请手动输入",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    OutlinedTextField(
                        value = questionCountText,
                        onValueChange = { v -> questionCountText = v.filter { it.isDigit() } },
                        label = { Text("题目数量") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val count = questionCountText.toIntOrNull() ?: 0
                        if (count > 0) {
                            showQuestionDialog = false
                            currentSessionId?.let { sid ->
                                sessionViewModel.startSession(userId, sid, count)
                                onStartSession(sid)
                            }
                        }
                    }
                ) { Text("开始写作业") }
            },
            dismissButton = {
                TextButton(onClick = { showQuestionDialog = false }) {
                    Text("取消")
                }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("拍照录入作业") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "返回")
                    }
                }
            )
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                ) {
                    // 识别状态提示
                    if (captureState.pages.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (detectedQuestions > 0) {
                                Text(
                                    "✅ 已识别 $detectedQuestions 道题",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.weight(1f),
                                )
                            } else if (analysisTimedOut) {
                                Text(
                                    "⚠️ 识别超时",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.weight(1f),
                                )
                            } else if (waitingForAnalysis) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    strokeWidth = 2.dp,
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "AI 正在识别题目...",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // 拍照按钮
                        FilledIconButton(
                            onClick = {
                                if (!hasCameraPermission) {
                                    permissionLauncher.launch(Manifest.permission.CAMERA)
                                    return@FilledIconButton
                                }
                                imageCapture.takePicture(
                                    cameraExecutor,
                                    object : ImageCapture.OnImageCapturedCallback() {
                                        override fun onCaptureSuccess(image: ImageProxy) {
                                            val bitmap = image.toBitmap()
                                            captureViewModel.captureAndUploadPage(userId, bitmap)
                                            image.close()
                                        }
                                        override fun onError(e: ImageCaptureException) {
                                            Log.e("CaptureScreen", "拍照失败", e)
                                        }
                                    }
                                )
                            },
                            modifier = Modifier.size(64.dp),
                        ) {
                            Icon(Icons.Default.CameraAlt, "拍照", Modifier.size(28.dp))
                        }

                        // 开始写作业
                        Button(
                            onClick = {
                                if (sessionState.questions.isNotEmpty()) {
                                    showReviewSheet = true
                                } else {
                                    // 预填充识别到的数量，让用户确认或调整
                                    questionCountText = if (detectedQuestions > 0) "$detectedQuestions" else ""
                                    showQuestionDialog = true
                                }
                            },
                            enabled = captureState.pages.isNotEmpty() && !captureState.isUploading,
                            modifier = Modifier.height(52.dp),
                        ) {
                            Icon(Icons.Default.Check, null, Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            if (detectedQuestions > 0) {
                                Text("开始写作业 ($detectedQuestions 题)")
                            } else {
                                Text("开始写作业 (${captureState.pages.size}页)")
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (!hasCameraPermission) {
                // 没有权限时的提示
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text("📷", fontSize = 48.sp)
                        Text("需要相机权限才能拍照")
                        Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                            Text("授予权限")
                        }
                    }
                }
            } else {
                // 相机预览
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                ) {
                    val previewView = remember { PreviewView(context) }

                    LaunchedEffect(lifecycleOwner, hasCameraPermission) {
                        try {
                            val cameraProvider = ProcessCameraProvider.getInstance(context).get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageCapture,
                            )
                        } catch (e: Exception) {
                            Log.e("CaptureScreen", "Camera bind failed", e)
                        }
                    }

                    AndroidView(
                        factory = { previewView },
                        modifier = Modifier.fillMaxSize(),
                    )

                    // 提示
                    if (captureState.pages.isEmpty()) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 16.dp),
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(
                                "📷 将作业本放在镜头下，逐页拍照",
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }

            // 已拍页面缩略图
            if (captureState.pages.isNotEmpty()) {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(captureState.pages) { page ->
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(8.dp)),
                        ) {
                            Image(
                                bitmap = page.thumbnail.asImageBitmap(),
                                contentDescription = "第${page.pageIndex}页",
                                modifier = Modifier.fillMaxSize(),
                            )
                            if (page.uploading) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.6f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(Modifier.size(24.dp))
                                }
                            }
                            Text(
                                "${page.pageIndex}",
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(4.dp)
                                    .background(
                                        MaterialTheme.colorScheme.primary,
                                        RoundedCornerShape(4.dp)
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showReviewSheet && sessionState.questions.isNotEmpty()) {
        com.stand8one.homeworkbuddy.ui.components.ReviewQuestionsSheet(
            questions = sessionState.questions,
            onDismiss = { showReviewSheet = false },
            onConfirm = {
                showReviewSheet = false
                val sid = currentSessionId
                if (sid != null) {
                    sessionViewModel.startSession(userId, sid, sessionState.session?.totalQuestions ?: 0)
                    onStartSession(sid)
                }
            },
            onDeleteQuestion = { qId ->
                val sid = currentSessionId
                if (sid != null) {
                    sessionViewModel.deleteQuestion(userId, sid, qId)
                }
            },
            onUpdateEstimatedMinutes = { qId, delta ->
                val sid = currentSessionId
                if (sid != null) {
                    sessionViewModel.updateQuestionEstimatedMinutes(userId, sid, qId, delta)
                }
            }
        )
    }
}
