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
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "위젯 업데이트 작업 시작")

            // 오늘의 공모주 API 호출
            val ipoData = fetchTodayIpo()
            
            if (ipoData == null) {
                Log.e(TAG, "공모주 데이터를 가져오지 못함")
                // 데이터가 없어도 기본 메시지로 업데이트
                updateWidgetData(
                    "오늘 공모주가 없습니다", "-", "-", "-",
                    "데이터 없음", "-", "-", "-",
                    "데이터 없음", "-", "-", "-"
                )
                return@withContext Result.success()
            }

            // 데이터 파싱 및 위젯 업데이트
            if (ipoData.length() > 0) {
                // 첫 번째 행 데이터
                val firstItem = ipoData.getJSONObject(0)
                val row1Name = firstItem.optString("title", "데이터 없음")
                val subscriptionDate1 = extractStartDate(firstItem.optString("subscriptiondate", ""))
                val refundDate1 = firstItem.optString("refunddate", "")
                val listingDate1 = firstItem.optString("listingdate", "")

                Log.d(TAG, "Row1 - 종목: $row1Name")
                Log.d(TAG, "Row1 - 청약일: $subscriptionDate1, 환불일: $refundDate1, 상장일: $listingDate1")

                val row1Dday = calculateNearestDday(
                    subscriptionDate1,
                    refundDate1,
                    listingDate1
                )

                Log.d(TAG, "Row1 - D-day: $row1Dday")
                val confirmedPrice = firstItem.optString("confirmedprice", "")
                val row1Price = if (confirmedPrice.isNotEmpty() && confirmedPrice != "-원") confirmedPrice else "-"
                val row1Securities = formatSecurities(firstItem.optJSONArray("brokers"))

                // 두 번째 행 데이터 (있는 경우)
                val row2Name: String
                val row2Dday: String
                val row2Price: String
                val row2Securities: String
                if (ipoData.length() > 1) {
                    val secondItem = ipoData.getJSONObject(1)
                    row2Name = secondItem.optString("title", "데이터 없음")
                    val subscriptionDate2 = extractStartDate(secondItem.optString("subscriptiondate", ""))
                    row2Dday = calculateNearestDday(
                        subscriptionDate2,
                        secondItem.optString("refunddate", ""),
                        secondItem.optString("listingdate", "")
                    )
                    val confirmedPrice2 = secondItem.optString("confirmedprice", "")
                    row2Price = if (confirmedPrice2.isNotEmpty() && confirmedPrice2 != "-원") confirmedPrice2 else "-"
                    row2Securities = formatSecurities(secondItem.optJSONArray("brokers"))
                } else {
                    row2Name = "데이터 없음"
                    row2Dday = "-"
                    row2Price = "-"
                    row2Securities = "-"
                }

                // 세 번째 행 데이터 (있는 경우)
                val row3Name: String
                val row3Dday: String
                val row3Price: String
                val row3Securities: String
                if (ipoData.length() > 2) {
                    val thirdItem = ipoData.getJSONObject(2)
                    row3Name = thirdItem.optString("title", "데이터 없음")
                    val subscriptionDate3 = extractStartDate(thirdItem.optString("subscriptiondate", ""))
                    row3Dday = calculateNearestDday(
                        subscriptionDate3,
                        thirdItem.optString("refunddate", ""),
                        thirdItem.optString("listingdate", "")
                    )
                    val confirmedPrice3 = thirdItem.optString("confirmedprice", "")
                    row3Price = if (confirmedPrice3.isNotEmpty() && confirmedPrice3 != "-원") confirmedPrice3 else "-"
                    row3Securities = formatSecurities(thirdItem.optJSONArray("brokers"))
                } else {
                    row3Name = "데이터 없음"
                    row3Dday = "-"
                    row3Price = "-"
                    row3Securities = "-"
                }

                updateWidgetData(
                    row1Name, row1Dday, row1Price, row1Securities,
                    row2Name, row2Dday, row2Price, row2Securities,
                    row3Name, row3Dday, row3Price, row3Securities
                )
                Log.d(TAG, "위젯 업데이트 완료: $row1Name, $row2Name, $row3Name")
            } else {
                // 데이터가 없는 경우
                updateWidgetData(
                    "오늘 공모주가 없습니다", "-", "-", "-",
                    "데이터 없음", "-", "-", "-",
                    "데이터 없음", "-", "-", "-"
                )
                Log.d(TAG, "위젯 업데이트 완료: 데이터 없음")
            }

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
    private fun updateWidgetData(
        row1Name: String, row1Dday: String, row1Price: String, row1Securities: String,
        row2Name: String, row2Dday: String, row2Price: String, row2Securities: String,
        row3Name: String, row3Dday: String, row3Price: String, row3Securities: String
    ) {
        Log.d(TAG, "위젯 데이터 저장 시작: row1=$row1Name, row2=$row2Name, row3=$row3Name")

        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("row1_name", row1Name)
        editor.putString("row1_dday", row1Dday)
        editor.putString("row1_price", row1Price)
        editor.putString("row1_securities", row1Securities)
        editor.putString("row2_name", row2Name)
        editor.putString("row2_dday", row2Dday)
        editor.putString("row2_price", row2Price)
        editor.putString("row2_securities", row2Securities)
        editor.putString("row3_name", row3Name)
        editor.putString("row3_dday", row3Dday)
        editor.putString("row3_price", row3Price)
        editor.putString("row3_securities", row3Securities)
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
     * 청약 날짜 범위에서 시작 날짜만 추출
     * 예: "2026.01.12~2026.01.13" -> "2026.01.12"
     */
    private fun extractStartDate(dateRange: String): String {
        if (dateRange.isEmpty()) return ""

        return try {
            if (dateRange.contains("~")) {
                dateRange.split("~")[0].trim()
            } else {
                dateRange.trim()
            }
        } catch (e: Exception) {
            Log.e(TAG, "청약 날짜 추출 실패: $dateRange", e)
            ""
        }
    }

    /**
     * 청약일, 환불일, 상장일 중 가장 가까운 날짜의 D-day 계산
     * 반환 형식: "청약 D-3", "환불 D-Day", "상장 D+1" 등
     */
    private fun calculateNearestDday(
        subscriptionStart: String,
        refundDate: String,
        listingDate: String
    ): String {
        data class DateInfo(val date: java.util.Date, val dday: String, val type: String)

        val dateInfos = mutableListOf<DateInfo>()
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // 청약일 확인
        parseDate(subscriptionStart)?.let { subDate ->
            val subCal = Calendar.getInstance().apply {
                time = subDate
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (subCal.timeInMillis >= today.timeInMillis) {
                val diffDays = ((subCal.timeInMillis - today.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
                val dday = when {
                    diffDays > 0 -> "D-$diffDays"
                    diffDays == 0 -> "D-Day"
                    else -> "D+${-diffDays}"
                }
                dateInfos.add(DateInfo(subDate, dday, "청약"))
            }
        }

        // 환불일 확인
        parseDate(refundDate)?.let { refDate ->
            val refCal = Calendar.getInstance().apply {
                time = refDate
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (refCal.timeInMillis >= today.timeInMillis) {
                val diffDays = ((refCal.timeInMillis - today.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
                val dday = when {
                    diffDays > 0 -> "D-$diffDays"
                    diffDays == 0 -> "D-Day"
                    else -> "D+${-diffDays}"
                }
                dateInfos.add(DateInfo(refDate, dday, "환불"))
            }
        }

        // 상장일 확인
        parseDate(listingDate)?.let { listDate ->
            val listCal = Calendar.getInstance().apply {
                time = listDate
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (listCal.timeInMillis >= today.timeInMillis) {
                val diffDays = ((listCal.timeInMillis - today.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
                val dday = when {
                    diffDays > 0 -> "D-$diffDays"
                    diffDays == 0 -> "D-Day"
                    else -> "D+${-diffDays}"
                }
                dateInfos.add(DateInfo(listDate, dday, "상장"))
            }
        }

        // 가장 가까운 날짜 찾기 - "타입 D-day" 형식으로 반환
        return dateInfos.minByOrNull { it.date }?.let { "${it.type} ${it.dday}" } ?: "-"
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

            when {
                diffInDays > 0 -> "D-$diffInDays"
                diffInDays == 0 -> "D-Day"
                else -> "D+${-diffInDays}"
            }
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
