package com.stand8one.homeworkbuddy.service

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.imgproc.Imgproc

/**
 * 图像质量检测器
 * 在端侧（Android）检测照片质量，避免无意义的上传和分析
 */
object ImageQualityChecker {

    /**
     * 模糊检测 - 使用 Laplacian 方差法
     * 方差越小说明越模糊
     */
    fun isBlurry(bitmap: Bitmap, threshold: Double = 100.0): Boolean {
        val mat = bitmapToMat(bitmap)
        val laplacian = Mat()
        Imgproc.Laplacian(mat, laplacian, org.opencv.core.CvType.CV_64F)

        val mean = MatOfDouble()
        val stddev = MatOfDouble()
        org.opencv.core.Core.meanStdDev(laplacian, mean, stddev)

        val variance = stddev.get(0, 0)[0].let { it * it }
        return variance < threshold
    }

    /**
     * 遮挡检测 - 检测画面中大面积单色区域
     * 如果画面中有超过一定比例的区域颜色非常接近，可能是被遮挡了
     */
    fun isOccluded(bitmap: Bitmap, threshold: Float = 0.6f): Boolean {
        // 简化实现：检测画面中心区域的颜色方差
        val centerX = bitmap.width / 4
        val centerY = bitmap.height / 4
        val centerW = bitmap.width / 2
        val centerH = bitmap.height / 2

        val pixels = IntArray(centerW * centerH)
        bitmap.getPixels(pixels, 0, centerW, centerX, centerY, centerW, centerH)

        // 计算灰度值的标准差
        val grayValues = pixels.map { pixel ->
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8) and 0xFF
            val b = pixel and 0xFF
            (0.299 * r + 0.587 * g + 0.114 * b)
        }

        val mean = grayValues.average()
        val variance = grayValues.map { (it - mean) * (it - mean) }.average()
        val stdDev = Math.sqrt(variance)

        // 标准差很低说明颜色很均匀，可能被遮挡
        return stdDev < 20.0
    }

    /**
     * 视角偏移检测 - 对比两帧之间的特征点偏移量
     * 如果偏移量突然很大，说明手机被碰歪了
     */
    fun hasAngleShifted(
        previousBitmap: Bitmap,
        currentBitmap: Bitmap,
        threshold: Double = 50.0
    ): Boolean {
        // 简化实现：对比两帧的直方图相关性
        val prevHist = calculateHistogram(previousBitmap)
        val currHist = calculateHistogram(currentBitmap)

        val correlation = compareHistograms(prevHist, currHist)
        // 相关性低说明画面变化大
        return correlation < 0.5
    }

    private fun bitmapToMat(bitmap: Bitmap): Mat {
        val mat = Mat()
        org.opencv.android.Utils.bitmapToMat(bitmap, mat)
        Imgproc.cvtColor(mat, mat, Imgproc.COLOR_RGBA2GRAY)
        return mat
    }

    private fun calculateHistogram(bitmap: Bitmap): FloatArray {
        val histogram = FloatArray(256)
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        for (pixel in pixels) {
            val gray = ((pixel shr 16 and 0xFF) * 0.299 +
                    (pixel shr 8 and 0xFF) * 0.587 +
                    (pixel and 0xFF) * 0.114).toInt()
            histogram[gray.coerceIn(0, 255)]++
        }

        // 归一化
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
