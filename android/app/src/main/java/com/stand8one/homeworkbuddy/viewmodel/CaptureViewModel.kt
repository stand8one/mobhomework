package com.stand8one.homeworkbuddy.viewmodel

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.stand8one.homeworkbuddy.repository.CaptureRepository
import com.stand8one.homeworkbuddy.repository.PageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import javax.inject.Inject

data class CapturedPage(
    val pageIndex: Int,
    val thumbnail: Bitmap,
    val pageId: String? = null,    // null = 还在上传
    val uploading: Boolean = true,
)

data class CaptureUiState(
    val pages: List<CapturedPage> = emptyList(),
    val sessionId: String? = null,
    val isUploading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class CaptureViewModel @Inject constructor(
    private val pageRepository: PageRepository,
    private val captureRepository: CaptureRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CaptureUiState())
    val uiState: StateFlow<CaptureUiState> = _uiState.asStateFlow()

    /**
     * 设置当前 session ID
     */
    fun setSessionId(sessionId: String) {
        _uiState.value = _uiState.value.copy(sessionId = sessionId)
    }

    /**
     * 拍照并上传一页作业
     */
    fun captureAndUploadPage(userId: String, bitmap: Bitmap) {
        android.util.Log.d("CaptureViewModel", "captureAndUploadPage called. sessionId: ${_uiState.value.sessionId}")
        val sessionId = _uiState.value.sessionId ?: return
        val pageIndex = _uiState.value.pages.size + 1

        // 立即添加到列表（显示缩略图 + 上传中状态）
        val page = CapturedPage(
            pageIndex = pageIndex,
            thumbnail = bitmap,
            uploading = true,
        )
        _uiState.value = _uiState.value.copy(
            pages = _uiState.value.pages + page,
            isUploading = true,
        )
        android.util.Log.d("CaptureViewModel", "UI updated, launching coroutine to upload..")

        viewModelScope.launch {
            try {
                val photoBytes = bitmapToJpeg(bitmap)
                android.util.Log.d("CaptureViewModel", "Converted bitmap to bytes, passing to PageRepository..")
                val pageId = pageRepository.createPage(userId, sessionId, pageIndex, photoBytes)
                android.util.Log.d("CaptureViewModel", "Upload succeeded, updating UI with pageId $pageId")

                // 更新上传状态
                _uiState.value = _uiState.value.copy(
                    pages = _uiState.value.pages.map {
                        if (it.pageIndex == pageIndex) it.copy(pageId = pageId, uploading = false)
                        else it
                    },
                    isUploading = false,
                )
            } catch (e: Exception) {
                android.util.Log.e("CaptureViewModel", "Upload failed: ${e.message}", e)
                _uiState.value = _uiState.value.copy(
                    error = "上传失败: ${e.message}",
                    isUploading = false,
                )
            }
        }
    }

    /**
     * 执行一次定时采集（高拍仪模式）
     */
    fun performCapture(userId: String, photoBytes: ByteArray, videoBytes: ByteArray?) {
        val sessionId = _uiState.value.sessionId ?: return

        viewModelScope.launch {
            try {
                captureRepository.createCapture(
                    userId = userId,
                    sessionId = sessionId,
                    photoBytes = photoBytes,
                    videoBytes = videoBytes,
                    quality = "good",
                )
            } catch (e: Exception) {
                // 采集失败不中断全局，仅记录
                _uiState.value = _uiState.value.copy(
                    error = "采集上传失败: ${e.message}"
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    private fun bitmapToJpeg(bitmap: Bitmap, quality: Int = 85): ByteArray {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
        return stream.toByteArray()
    }
}
