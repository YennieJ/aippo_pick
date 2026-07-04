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

            // 행 1~6 데이터 (medium=3, large=6)
            for (i in 1..6) {
                data.getString("row${i}_name")?.let { editor.putString("row${i}_name", it) }
                data.getString("row${i}_dday")?.let { editor.putString("row${i}_dday", it) }
                data.getString("row${i}_price")?.let { editor.putString("row${i}_price", it) }
                data.getString("row${i}_securities")?.let { editor.putString("row${i}_securities", it) }
            }

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

            // 행 1~6 데이터
            for (i in 1..6) {
                result.putString("row${i}_name", prefs.getString("row${i}_name", "") ?: "")
                result.putString("row${i}_dday", prefs.getString("row${i}_dday", "") ?: "")
                result.putString("row${i}_price", prefs.getString("row${i}_price", "") ?: "")
                result.putString("row${i}_securities", prefs.getString("row${i}_securities", "") ?: "")
            }

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
