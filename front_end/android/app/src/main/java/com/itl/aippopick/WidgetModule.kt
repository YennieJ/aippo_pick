package com.itl.aippopick

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetModule"

    @ReactMethod
    fun updateWidgetData(data: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            val editor = prefs.edit()

            // 행 1 데이터
            data.getString("row1_name")?.let { editor.putString("row1_name", it) }
            data.getString("row1_dday")?.let { editor.putString("row1_dday", it) }
            data.getString("row1_price")?.let { editor.putString("row1_price", it) }
            data.getString("row1_securities")?.let { editor.putString("row1_securities", it) }

            // 행 2 데이터
            data.getString("row2_name")?.let { editor.putString("row2_name", it) }
            data.getString("row2_dday")?.let { editor.putString("row2_dday", it) }
            data.getString("row2_price")?.let { editor.putString("row2_price", it) }
            data.getString("row2_securities")?.let { editor.putString("row2_securities", it) }

            // 행 3 데이터
            data.getString("row3_name")?.let { editor.putString("row3_name", it) }
            data.getString("row3_dday")?.let { editor.putString("row3_dday", it) }
            data.getString("row3_price")?.let { editor.putString("row3_price", it) }
            data.getString("row3_securities")?.let { editor.putString("row3_securities", it) }

            editor.apply()

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widget = ComponentName(context, MyWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(widget)

            if (appWidgetIds.isNotEmpty()) {
                MyWidgetProvider.updateAllWidgets(context, appWidgetManager, appWidgetIds)
                promise.resolve("Widget updated")
            } else {
                promise.resolve("No widgets found")
            }
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getWidgetData(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            val result = Arguments.createMap()

            // 행 1 데이터
            result.putString("row1_name", prefs.getString("row1_name", "") ?: "")
            result.putString("row1_dday", prefs.getString("row1_dday", "") ?: "")
            result.putString("row1_price", prefs.getString("row1_price", "") ?: "")
            result.putString("row1_securities", prefs.getString("row1_securities", "") ?: "")

            // 행 2 데이터
            result.putString("row2_name", prefs.getString("row2_name", "") ?: "")
            result.putString("row2_dday", prefs.getString("row2_dday", "") ?: "")
            result.putString("row2_price", prefs.getString("row2_price", "") ?: "")
            result.putString("row2_securities", prefs.getString("row2_securities", "") ?: "")

            // 행 3 데이터
            result.putString("row3_name", prefs.getString("row3_name", "") ?: "")
            result.putString("row3_dday", prefs.getString("row3_dday", "") ?: "")
            result.putString("row3_price", prefs.getString("row3_price", "") ?: "")
            result.putString("row3_securities", prefs.getString("row3_securities", "") ?: "")

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun forceRefreshWidget(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widget = ComponentName(context, MyWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(widget)

            if (appWidgetIds.isNotEmpty()) {
                MyWidgetProvider.updateAllWidgets(context, appWidgetManager, appWidgetIds)
                promise.resolve("Widget refreshed: ${appWidgetIds.size} widget(s)")
            } else {
                promise.resolve("No widgets found on home screen")
            }
        } catch (e: Exception) {
            promise.reject("REFRESH_ERROR", e.message, e)
        }
    }
}
