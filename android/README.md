# Android App - 作业成长助手

## 项目说明
Android 端使用 **Kotlin + Jetpack Compose** 开发，需要在 Android Studio 中初始化完整项目。

## 初始化步骤

1. 在 Android Studio 中创建新项目:
   - 模板: Empty Compose Activity
   - Package name: `com.stand8one.homeworkbuddy`
   - Minimum SDK: API 26 (Android 8.0)
   - Language: Kotlin

2. 将项目文件移到 `android/` 目录

3. 添加 Firebase SDK (在 `app/build.gradle.kts`):
```kotlin
dependencies {
    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.0.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // CameraX
    implementation("androidx.camera:camera-core:1.3.0")
    implementation("androidx.camera:camera-camera2:1.3.0")
    implementation("androidx.camera:camera-lifecycle:1.3.0")
    implementation("androidx.camera:camera-view:1.3.0")

    // WorkManager (后台上传)
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Room (离线缓存)
    implementation("androidx.room:room-runtime:2.6.0")
    implementation("androidx.room:room-ktx:2.6.0")
    kapt("androidx.room:room-compiler:2.6.0")

    // Navigation Compose
    implementation("androidx.navigation:navigation-compose:2.7.0")
}
```

4. 下载 `google-services.json` 放入 `app/` 目录

## 核心模块

详见 `src/` 目录下的类定义文件

## 运行

```bash
# 在 Android Studio 中运行，或:
./gradlew installDebug
```
