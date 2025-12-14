package com.itl.aippopick

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import android.util.Log
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class MyWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MyWidgetProvider"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)

            // 행 1 데이터
            val row1Name = prefs.getString("row1_name", "") ?: ""
            val row1Dday = prefs.getString("row1_dday", "") ?: ""
            val row1Price = prefs.getString("row1_price", "") ?: ""
            val row1Securities = prefs.getString("row1_securities", "") ?: ""

            // 행 2 데이터
            val row2Name = prefs.getString("row2_name", "") ?: ""
            val row2Dday = prefs.getString("row2_dday", "") ?: ""
            val row2Price = prefs.getString("row2_price", "") ?: ""
            val row2Securities = prefs.getString("row2_securities", "") ?: ""

            // 행 3 데이터
            val row3Name = prefs.getString("row3_name", "") ?: ""
            val row3Dday = prefs.getString("row3_dday", "") ?: ""
            val row3Price = prefs.getString("row3_price", "") ?: ""
            val row3Securities = prefs.getString("row3_securities", "") ?: ""

            Log.d(TAG, "위젯 업데이트 - row1_name: $row1Name, row1_dday: $row1Dday")

            val isLoading = row1Name.isEmpty() || 
                           row1Name == "데이터 없음" || 
                           row1Name == "데이터 로딩 중..." ||
                           row1Name == "오늘 공모주가 없습니다"
            
            Log.d(TAG, "로딩 상태: $isLoading")

            val views = RemoteViews(context.packageName, R.layout.widget_layout)

            if (isLoading) {
                // 로딩 중: 이미지 표시, 테이블 숨김
                views.setViewVisibility(R.id.widget_loading_image, android.view.View.VISIBLE)
                views.setViewVisibility(R.id.widget_content_layout, android.view.View.GONE)
            } else {
                // 데이터 로드 완료: 테이블 표시, 이미지 숨김
                views.setViewVisibility(R.id.widget_loading_image, android.view.View.GONE)
                views.setViewVisibility(R.id.widget_content_layout, android.view.View.VISIBLE)

                // 행 1 업데이트
                views.setTextViewText(R.id.row1_name, row1Name)
                views.setTextViewText(R.id.row1_dday, row1Dday)
                views.setTextViewText(R.id.row1_price, row1Price)
                views.setTextViewText(R.id.row1_securities, row1Securities)
                views.setTextColor(R.id.row1_name, android.graphics.Color.parseColor("#000000"))
                views.setTextColor(R.id.row1_dday, android.graphics.Color.parseColor("#000000"))
                views.setTextColor(R.id.row1_price, android.graphics.Color.parseColor("#000000"))
                views.setTextColor(R.id.row1_securities, android.graphics.Color.parseColor("#000000"))

                // 행 2 업데이트
                if (row2Name.isNotEmpty() && row2Name != "데이터 없음") {
                    views.setTextViewText(R.id.row2_name, row2Name)
                    views.setTextViewText(R.id.row2_dday, row2Dday)
                    views.setTextViewText(R.id.row2_price, row2Price)
                    views.setTextViewText(R.id.row2_securities, row2Securities)
                    views.setTextColor(R.id.row2_name, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row2_dday, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row2_price, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row2_securities, android.graphics.Color.parseColor("#000000"))
                } else {
                    views.setTextViewText(R.id.row2_name, "데이터 없음")
                    views.setTextViewText(R.id.row2_dday, "-")
                    views.setTextViewText(R.id.row2_price, "-")
                    views.setTextViewText(R.id.row2_securities, "-")
                    views.setTextColor(R.id.row2_name, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row2_dday, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row2_price, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row2_securities, android.graphics.Color.parseColor("#999999"))
                }

                // 행 3 업데이트
                if (row3Name.isNotEmpty() && row3Name != "데이터 없음") {
                    views.setTextViewText(R.id.row3_name, row3Name)
                    views.setTextViewText(R.id.row3_dday, row3Dday)
                    views.setTextViewText(R.id.row3_price, row3Price)
                    views.setTextViewText(R.id.row3_securities, row3Securities)
                    views.setTextColor(R.id.row3_name, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row3_dday, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row3_price, android.graphics.Color.parseColor("#000000"))
                    views.setTextColor(R.id.row3_securities, android.graphics.Color.parseColor("#000000"))
                } else {
                    views.setTextViewText(R.id.row3_name, "데이터 없음")
                    views.setTextViewText(R.id.row3_dday, "-")
                    views.setTextViewText(R.id.row3_price, "-")
                    views.setTextViewText(R.id.row3_securities, "-")
                    views.setTextColor(R.id.row3_name, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row3_dday, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row3_price, android.graphics.Color.parseColor("#999999"))
                    views.setTextColor(R.id.row3_securities, android.graphics.Color.parseColor("#999999"))
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "Widget updated: $appWidgetId (loading: $isLoading)")
        }

        fun updateAllWidgets(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetIds: IntArray
        ) {
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // 위젯이 생성될 때 데이터가 없으면 즉시 업데이트 시도
        val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        val hasData = prefs.contains("row1_name") && prefs.getString("row1_name", "")?.isNotEmpty() == true

        if (!hasData) {
            Log.d(TAG, "위젯 데이터가 없어서 테스트 데이터 설정 및 업데이트 시작")

            // 테스트 데이터 설정
            val editor = prefs.edit()
            editor.putString("row1_name", "데이터 로딩 중...")
            editor.putString("row1_dday", "D-?")
            editor.putString("row1_price", "-")
            editor.putString("row1_securities", "-")
            editor.putString("row2_name", "잠시만 기다려주세요")
            editor.putString("row2_dday", "-")
            editor.putString("row2_price", "-")
            editor.putString("row2_securities", "-")
            editor.putString("row3_name", "데이터 없음")
            editor.putString("row3_dday", "-")
            editor.putString("row3_price", "-")
            editor.putString("row3_securities", "-")
            editor.apply()

            // 백그라운드에서 실제 데이터 가져오기
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(workRequest)
        }

        updateAllWidgets(context, appWidgetManager, appWidgetIds)
    }
}
