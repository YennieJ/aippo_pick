package com.itl.aippopick

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * 매일 12시에 실행되어 오늘의 공모주 데이터를 가져와 위젯에 업데이트
 */
class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "WidgetUpdateWorker"
        // 개발: HTTP IP, 프로덕션: HTTPS 도메인
        private val API_BASE_URL = if (BuildConfig.DEBUG) {
            "http://122.42.248.81:4000"
        } else {
            "https://api.aippopick.shop"
        }
        private const val PREFS_NAME = "widget_data"
        private const val MAX_ROWS = 6
    }

    private data class WidgetRow(
        val name: String,
        val dday: String,
        val price: String,
        val securities: String
    )

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "위젯 업데이트 작업 시작")

            // 오늘의 공모주 API 호출
            val ipoData = fetchTodayIpo()
            
            if (ipoData == null) {
                Log.e(TAG, "공모주 데이터를 가져오지 못함")
                // 데이터가 없으면 빈 상태로 업데이트
                updateWidgetData(emptyList())
                return@withContext Result.success()
            }

            // 데이터 파싱 (최대 6종목) 및 위젯 업데이트
            val rows = mutableListOf<WidgetRow>()
            val count = minOf(ipoData.length(), MAX_ROWS)
            for (i in 0 until count) {
                val item = ipoData.getJSONObject(i)
                val name = item.optString("title", "데이터 없음")
                val dday = ddayByStatus(
                    item.optString("status", ""),
                    item.optString("subscriptiondate", ""),
                    item.optString("refunddate", ""),
                    item.optString("listingdate", "")
                )
                val confirmedPrice = item.optString("confirmedprice", "")
                val price = if (confirmedPrice.isNotEmpty() && confirmedPrice != "-원") confirmedPrice else "-"
                val securities = formatSecurities(item.optJSONArray("brokers"))
                rows.add(WidgetRow(name, dday, price, securities))
            }

            updateWidgetData(rows)
            Log.d(TAG, "위젯 업데이트 완료: ${rows.size}종목")

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "위젯 업데이트 실패", e)
            Result.retry() // 실패 시 재시도
        }
    }

    /**
     * 오늘의 공모주 데이터를 API에서 가져오기
     */
    private suspend fun fetchTodayIpo(): JSONArray? = withContext(Dispatchers.IO) {
        try {
            val client = OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()

            val request = Request.Builder()
                .url("$API_BASE_URL/data_ipo/today")
                .get()
                .build()

            val response = client.newCall(request).execute()
            
            Log.d(TAG, "API 응답 코드: ${response.code}")
            
            if (!response.isSuccessful) {
                Log.e(TAG, "API 호출 실패: ${response.code}")
                return@withContext null
            }

            val responseBody = response.body?.string()
            if (responseBody == null) {
                Log.e(TAG, "응답 본문이 null")
                return@withContext null
            }

            Log.d(TAG, "API 응답 본문: $responseBody")
            val jsonArray = JSONArray(responseBody)
            Log.d(TAG, "파싱된 데이터 개수: ${jsonArray.length()}")
            jsonArray
        } catch (e: Exception) {
            Log.e(TAG, "API 호출 중 오류", e)
            null
        }
    }

    /**
     * SharedPreferences에 데이터 저장 및 위젯 업데이트
     */
    private fun updateWidgetData(rows: List<WidgetRow>) {
        Log.d(TAG, "위젯 데이터 저장 시작: ${rows.size}종목")

        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        // row1~row6: 데이터가 있으면 저장, 없으면 이전 잔존 데이터 제거
        for (i in 1..MAX_ROWS) {
            val r = rows.getOrNull(i - 1)
            if (r != null) {
                editor.putString("row${i}_name", r.name)
                editor.putString("row${i}_dday", r.dday)
                editor.putString("row${i}_price", r.price)
                editor.putString("row${i}_securities", r.securities)
            } else {
                editor.remove("row${i}_name")
                editor.remove("row${i}_dday")
                editor.remove("row${i}_price")
                editor.remove("row${i}_securities")
            }
        }
        val saved = editor.commit() // 동기적으로 저장

        Log.d(TAG, "SharedPreferences 저장 완료: $saved")

        // 위젯 업데이트
        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(applicationContext)
        val widget = android.content.ComponentName(applicationContext, MyWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(widget)

        Log.d(TAG, "위젯 ID 개수: ${appWidgetIds.size}")
        if (appWidgetIds.isNotEmpty()) {
            MyWidgetProvider.updateAllWidgets(applicationContext, appWidgetManager, appWidgetIds)
            Log.d(TAG, "위젯 업데이트 완료")
        } else {
            Log.w(TAG, "위젯이 설치되지 않음")
        }
    }

    /**
     * 청약 날짜: 범위(시작~종료)일 때 시작일이 지나면 종료일 기준으로 D-day
     * 예: "2026.01.12~2026.01.13" → 오늘 >= 01.12 이면 "2026.01.13", 아니면 "2026.01.12"
     */
    private fun extractStartDate(dateRange: String): String {
        if (dateRange.isEmpty()) return ""

        return try {
            val trimmed = dateRange.trim()
            if (trimmed.contains("~")) {
                val parts = trimmed.split("~").map { it.trim() }
                if (parts.size < 2) return parts.firstOrNull() ?: ""
                val startDate = parseDate(parts[0]) ?: return parts[0]
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }.time
                if (today.time >= startDate.time) parts[1] else parts[0]
            } else {
                trimmed
            }
        } catch (e: Exception) {
            Log.e(TAG, "청약 날짜 추출 실패: $dateRange", e)
            ""
        }
    }

    /**
     * 상세(날짜 3종) 기준으로 통일: status는 신뢰하지 않고 날짜로 상태를 추론해 D-day 표기
     */
    private fun ddayByStatus(
        status: String,
        subscription: String,
        refundDate: String,
        listingDate: String
    ): String {
        // status 파라미터는 API 호환을 위해 유지하지만, 실제 표시는 날짜 기반 추론을 사용
        return calculateNearestDdayWithStatus(
            extractStartDate(subscription),
            refundDate,
            listingDate
        )
    }

    /**
     * 앱과 동일 규칙의 D-day 텍스트
     * - 과거: "-"
     * - 오늘: "D-Day"
     * - 미래: "D-N"
     */
    private fun formatAppDday(diffDays: Int): String {
        return when {
            diffDays < 0 -> "-"
            diffDays == 0 -> "D-Day"
            else -> "D-$diffDays"
        }
    }

    /**
     * 청약일, 환불일, 상장일 중 가장 가까운 날짜의 D-day 계산
     * 앱과 동일: 가장 가까운 "미래/오늘" 일정의 D-day만 반환 (과거는 "-" 처리)
     */
    private fun calculateNearestDdayWithStatus(
        subscriptionStart: String,
        refundDate: String,
        listingDate: String
    ): String {
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        fun diffDaysFor(date: java.util.Date): Int {
            val cal = Calendar.getInstance().apply {
                time = date
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            return ((cal.timeInMillis - today.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
        }

        data class Candidate(val status: String, val diffDays: Int)

        val candidates = listOfNotNull(
            parseDate(subscriptionStart)?.let { d -> Candidate("청약", diffDaysFor(d)) },
            parseDate(refundDate)?.let { d -> Candidate("환불", diffDaysFor(d)) },
            parseDate(listingDate)?.let { d -> Candidate("상장", diffDaysFor(d)) },
        ).filter { it.diffDays >= 0 }

        val nearest = candidates.minByOrNull { it.diffDays } ?: return "-"
        val ddayText = formatAppDday(nearest.diffDays)
        if (ddayText == "-") return "-"
        return "${nearest.status} $ddayText"
    }

    /**
     * 날짜 문자열을 Date 객체로 파싱
     */
    private fun parseDate(dateString: String): java.util.Date? {
        if (dateString.isEmpty()) return null

        val formats = listOf(
            "yyyy-MM-dd",
            "yyyy.MM.dd",
            "yyyy/MM/dd"
        )

        for (format in formats) {
            try {
                val dateFormat = SimpleDateFormat(format, Locale.getDefault())
                val date = dateFormat.parse(dateString)
                if (date != null) return date
            } catch (e: Exception) {
                // 다음 형식 시도
            }
        }
        return null
    }

    /**
     * 상장일로부터 디데이 계산
     */
    private fun calculateDday(listingDate: String): String {
        if (listingDate.isEmpty()) return "-"

        return try {
            // 여러 날짜 형식 시도
            val formats = listOf(
                "yyyy-MM-dd",
                "yyyy.MM.dd",
                "yyyy/MM/dd"
            )
            
            var targetDate: java.util.Date? = null
            for (format in formats) {
                try {
                    val dateFormat = SimpleDateFormat(format, Locale.getDefault())
                    targetDate = dateFormat.parse(listingDate)
                    if (targetDate != null) break
                } catch (e: Exception) {
                    // 다음 형식 시도
                }
            }
            
            if (targetDate == null) return "-"

            val today = Calendar.getInstance()
            today.set(Calendar.HOUR_OF_DAY, 0)
            today.set(Calendar.MINUTE, 0)
            today.set(Calendar.SECOND, 0)
            today.set(Calendar.MILLISECOND, 0)

            val target = Calendar.getInstance()
            target.time = targetDate
            target.set(Calendar.HOUR_OF_DAY, 0)
            target.set(Calendar.MINUTE, 0)
            target.set(Calendar.SECOND, 0)
            target.set(Calendar.MILLISECOND, 0)

            val diffInMillis = target.timeInMillis - today.timeInMillis
            val diffInDays = (diffInMillis / (1000 * 60 * 60 * 24)).toInt()

            formatAppDday(diffInDays)
        } catch (e: Exception) {
            Log.e(TAG, "디데이 계산 실패: $listingDate", e)
            "-"
        }
    }

    /**
     * 증권사 배열을 콤마로 구분된 문자열로 변환
     */
    private fun formatSecurities(securities: JSONArray?): String {
        if (securities == null || securities.length() == 0) return "-"

        return try {
            val list = mutableListOf<String>()
            for (i in 0 until securities.length()) {
                val item = securities.optString(i)
                if (item.isNotEmpty()) {
                    list.add(item)
                }
            }
            if (list.isEmpty()) "-" else list.joinToString(", ")
        } catch (e: Exception) {
            Log.e(TAG, "증권사 포맷팅 실패", e)
            "-"
        }
    }
}
