import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * 보상형 광고 단위 ID (AI 리포트 잠금 해제용)
 * - dev(__DEV__): Google 공식 테스트 ID
 * - prod: .env의 EXPO_PUBLIC_ADMOB_* 값
 */
export const REWARDED_AI_REPORT_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AI_REPORT ?? TestIds.REWARDED,
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_AI_REPORT ?? TestIds.REWARDED,
      default: TestIds.REWARDED,
    });

/**
 * 홈 화면 네이티브 광고(고급형) 단위 ID
 */
export const NATIVE_HOME_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : Platform.select({
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE_HOME ?? TestIds.NATIVE,
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE_HOME ?? TestIds.NATIVE,
      default: TestIds.NATIVE,
    });
