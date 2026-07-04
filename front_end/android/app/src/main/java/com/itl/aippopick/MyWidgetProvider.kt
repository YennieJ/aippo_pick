package com.itl.aippopick

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

class MyWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "MyWidgetProvider"
        private const val MAX_ROWS = 6
        private const val PREFS_NAME = "widget_data"

        // 실제 데이터가 아닌 상태(로딩/없음) 표시용 sentinel
        private val EMPTY_SENTINELS = setOf(
            "", "데이터 없음", "데이터 로딩 중...", "잠시만 기다려주세요", "오늘 공모주가 없습니다"
        )

        private data class Row(
            val name: String,
            val dday: String,
            val price: String,
            val securities: String
        )

        // ---- prefs → 실제 종목 행 목록 (최대 6) ----
        private fun loadRows(context: Context): List<Row> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rows = mutableListOf<Row>()
            for (i in 1..MAX_ROWS) {
                val name = prefs.getString("row${i}_name", "") ?: ""
                if (name in EMPTY_SENTINELS) continue
                rows.add(
                    Row(
                        name = name,
                        dday = prefs.getString("row${i}_dday", "-") ?: "-",
                        price = prefs.getString("row${i}_price", "-") ?: "-",
                        securities = prefs.getString("row${i}_securities", "-") ?: "-"
                    )
                )
            }
            return rows
        }

        // A안: 공모가 없으면 "공모가 미정"
        private fun buildMeta(row: Row): String {
            val priceText = if (row.price.isBlank() || row.price == "-") "공모가 미정" else row.price
            return if (row.securities.isBlank() || row.securities == "-") priceText
            else "$priceText · ${row.securities}"
        }

        private fun statusOf(dday: String): String = dday.trim().substringBefore(" ")

        private fun badgeBgRes(status: String): Int = when (status) {
            "청약" -> R.drawable.widget_badge_sub
            "환불" -> R.drawable.widget_badge_refund
            "상장" -> R.drawable.widget_badge_list
            else -> R.drawable.widget_badge_none
        }

        // 아웃라인 스타일: 글자색 = 테두리와 동일한 상태별 hue (달력과 통일)
        private fun badgeTextColor(context: Context, status: String): Int {
            val res = when (status) {
                "청약" -> R.color.widget_badge_sub
                "환불" -> R.color.widget_badge_refund
                "상장" -> R.color.widget_badge_list
                else -> R.color.widget_badge_none
            }
            return ContextCompat.getColor(context, res)
        }

        // row index → view id
        private fun containerId(i: Int) = when (i) {
            1 -> R.id.row1_container; 2 -> R.id.row2_container; 3 -> R.id.row3_container
            4 -> R.id.row4_container; 5 -> R.id.row5_container; else -> R.id.row6_container
        }
        private fun nameId(i: Int) = when (i) {
            1 -> R.id.row1_name; 2 -> R.id.row2_name; 3 -> R.id.row3_name
            4 -> R.id.row4_name; 5 -> R.id.row5_name; else -> R.id.row6_name
        }
        private fun metaId(i: Int) = when (i) {
            1 -> R.id.row1_meta; 2 -> R.id.row2_meta; 3 -> R.id.row3_meta
            4 -> R.id.row4_meta; 5 -> R.id.row5_meta; else -> R.id.row6_meta
        }
        private fun badgeId(i: Int) = when (i) {
            1 -> R.id.row1_badge; 2 -> R.id.row2_badge; 3 -> R.id.row3_badge
            4 -> R.id.row4_badge; 5 -> R.id.row5_badge; else -> R.id.row6_badge
        }

        /**
         * 하나의 레이아웃(compact=3행 / large=6행)에 대해 RemoteViews 생성.
         * maxRows 만큼만 view id를 건드리므로, compact 레이아웃에 large용 id는 참조하지 않음.
         */
        private fun buildViews(
            context: Context,
            layoutRes: Int,
            maxRows: Int,
            rows: List<Row>,
            appWidgetId: Int
        ): RemoteViews {
            val views = RemoteViews(context.packageName, layoutRes)

            // 위젯 클릭 → 앱 실행
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }

            val visible = rows.take(maxRows)

            if (visible.isEmpty()) {
                views.setViewVisibility(R.id.widget_loading_image, View.VISIBLE)
                views.setViewVisibility(R.id.widget_content_layout, View.GONE)
                return views
            }

            views.setViewVisibility(R.id.widget_loading_image, View.GONE)
            views.setViewVisibility(R.id.widget_content_layout, View.VISIBLE)

            for (i in 1..maxRows) {
                if (i <= visible.size) {
                    val r = visible[i - 1]
                    val status = statusOf(r.dday)
                    views.setViewVisibility(containerId(i), View.VISIBLE)
                    views.setTextViewText(nameId(i), r.name)
                    views.setTextViewText(metaId(i), buildMeta(r))
                    views.setTextViewText(badgeId(i), r.dday)
                    views.setInt(badgeId(i), "setBackgroundResource", badgeBgRes(status))
                    views.setTextColor(badgeId(i), badgeTextColor(context, status))
                } else {
                    views.setViewVisibility(containerId(i), View.GONE)
                }
            }
            return views
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val rows = loadRows(context)
            Log.d(TAG, "위젯 업데이트 - 종목 수: ${rows.size}")

            val compact = buildViews(context, R.layout.widget_layout, 3, rows, appWidgetId)

            // API 31+: 위젯 크기에 따라 compact(3) / large(6) 자동 전환
            val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val large = buildViews(context, R.layout.widget_layout_large, MAX_ROWS, rows, appWidgetId)
                RemoteViews(
                    mapOf(
                        SizeF(250f, 110f) to compact,
                        SizeF(250f, 270f) to large
                    )
                )
            } else {
                compact
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "Widget updated: $appWidgetId")
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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hasData = prefs.contains("row1_name") &&
            (prefs.getString("row1_name", "") ?: "").let { it.isNotEmpty() && it !in EMPTY_SENTINELS }

        if (!hasData) {
            Log.d(TAG, "위젯 데이터가 없어서 업데이트 작업 시작")

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
