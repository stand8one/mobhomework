package com.stand8one.homeworkbuddy.service

import android.graphics.Bitmap

/**
 * 图像质量检测器
 * 在端侧（Android）检测照片质量，避免无意义的上传和分析
 *
 * 纯 Android API 实现（不依赖 OpenCV）
 */
object ImageQualityChecker {

    /**
     * 模糊检测 - 使用灰度像素方差法
     * 方差越小说明越模糊
     */
    fun isBlurry(bitmap: Bitmap, threshold: Double = 500.0): Boolean {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // 简化的拉普拉斯方差：计算每个像素与相邻像素的灰度差
        var sumDiffSquared = 0.0
        var count = 0

        for (y in 1 until height - 1) {
            for (x in 1 until width - 1) {
                val idx = y * width + x
                val center = grayValue(pixels[idx])
                val top = grayValue(pixels[(y - 1) * width + x])
                val bottom = grayValue(pixels[(y + 1) * width + x])
                val left = grayValue(pixels[y * width + (x - 1)])
                val right = grayValue(pixels[y * width + (x + 1)])

                // Laplacian = 4 * center - top - bottom - left - right
                val laplacian = 4.0 * center - top - bottom - left - right
                sumDiffSquared += laplacian * laplacian
                count++
            }
        }

        val variance = if (count > 0) sumDiffSquared / count else 0.0
        return variance < threshold
    }

    /**
     * 遮挡检测 - 检测画面中大面积单色区域
     * 如果画面中心区域颜色非常接近，可能是被遮挡了
     */
    fun isOccluded(bitmap: Bitmap): Boolean {
        val centerX = bitmap.width / 4
        val centerY = bitmap.height / 4
        val centerW = bitmap.width / 2
        val centerH = bitmap.height / 2

        val pixels = IntArray(centerW * centerH)
        bitmap.getPixels(pixels, 0, centerW, centerX, centerY, centerW, centerH)

        val grayValues = DoubleArray(pixels.size) { grayValue(pixels[it]) }

        val mean = grayValues.average()
        val variance = grayValues.map { (it - mean) * (it - mean) }.average()
        val stdDev = Math.sqrt(variance)

        // 标准差很低说明颜色很均匀，可能被遮挡
        return stdDev < 20.0
    }

    /**
     * 视角偏移检测 - 对比两帧之间的直方图相关性
     * 如果相关性低说明画面角度变化大
     */
    fun hasAngleShifted(previousBitmap: Bitmap, currentBitmap: Bitmap): Boolean {
        val prevHist = calculateHistogram(previousBitmap)
        val currHist = calculateHistogram(currentBitmap)

        val correlation = compareHistograms(prevHist, currHist)
        return correlation < 0.5
    }

    /**
     * 综合质量判断
     * @return "good" | "blurry" | "occluded"
     */
    fun checkQuality(bitmap: Bitmap): String {
        return when {
            isOccluded(bitmap) -> "occluded"
            isBlurry(bitmap) -> "blurry"
            else -> "good"
        }
    }

    private fun grayValue(pixel: Int): Double {
        val r = (pixel shr 16) and 0xFF
        val g = (pixel shr 8) and 0xFF
        val b = pixel and 0xFF
        return 0.299 * r + 0.587 * g + 0.114 * b
    }

    private fun calculateHistogram(bitmap: Bitmap): FloatArray {
        val histogram = FloatArray(256)
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        for (pixel in pixels) {
            val gray = grayValue(pixel).toInt().coerceIn(0, 255)
            histogram[gray]++
        }

        val total = pixels.size.toFloat()
        for (i in histogram.indices) {
            histogram[i] /= total
        }
        return histogram
    }

    private fun compareHistograms(hist1: FloatArray, hist2: FloatArray): Double {
        var sum = 0.0
        for (i in hist1.indices) {
            sum += Math.min(hist1[i].toDouble(), hist2[i].toDouble())
        }
        return sum
    }
}
