package com.stand8one.homeworkbuddy.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.stand8one.homeworkbuddy.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    data object Loading : AuthState()
    data class Authenticated(val user: FirebaseUser) : AuthState()
    data object Unauthenticated : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.observeAuthState().collect { user ->
                if (user != null) {
                    _authState.value = AuthState.Authenticated(user)
                } else {
                    autoSignIn()
                }
            }
        }
    }

    private fun autoSignIn() {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = authRepository.signInAnonymously()
            result.onFailure { e ->
                _authState.value = AuthState.Unauthenticated
                val msg = e.message ?: "未知错误"
                _error.value = when {
                    msg.contains("API key") || msg.contains("INVALID") ->
                        "Firebase 配置错误\n请替换 app/google-services.json\n并在 Firebase Console 启用匿名登录"
                    msg.contains("NETWORK") ->
                        "网络连接失败，请检查网络"
                    else ->
                        "登录失败: $msg"
                }
            }
        }
    }

    fun retry() {
        _error.value = null
        autoSignIn()
    }

    fun clearError() {
        _error.value = null
    }
}
