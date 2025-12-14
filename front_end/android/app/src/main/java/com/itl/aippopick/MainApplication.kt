package com.itl.aippopick

import android.app.Application
import android.content.res.Configuration
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(WidgetPackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    
    // 위젯 자동 업데이트 스케줄링 (매일 12시)
    scheduleWidgetUpdate()
    
    // 앱 실행 시 즉시 위젯 업데이트
    updateWidgetImmediately()
  }

  /**
   * 매일 12시에 위젯 업데이트 작업을 스케줄링
   */
  private fun scheduleWidgetUpdate() {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    // 매일 12시에 실행 (최소 15분 간격이므로 12시 근처에 실행)
    val workRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
      24, TimeUnit.HOURS, // 24시간마다
      1, TimeUnit.HOURS  // 유연한 실행 윈도우 (1시간)
    )
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
      "widget_update_work",
      ExistingPeriodicWorkPolicy.KEEP, // 이미 있으면 유지
      workRequest
    )
  }

  /**
   * 앱 실행 시 즉시 위젯 업데이트
   */
  private fun updateWidgetImmediately() {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val workRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(this).enqueue(workRequest)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
