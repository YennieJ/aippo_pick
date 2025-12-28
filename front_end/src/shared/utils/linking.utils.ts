import { Linking, Platform } from 'react-native';

/**
 * 딥링크로 앱 열기
 * @param scheme - 딥링크 스킴 (예: 'miraeasset://')
 * @param playStoreUrl - 플레이스토어 URL (앱이 없을 경우)
 * @param appStoreUrl - 앱스토어 URL (iOS, 앱이 없을 경우)
 * @returns Promise<boolean> - 성공 여부
 */
export const openDeepLink = async (
  scheme: string,
  playStoreUrl: string,
  appStoreUrl?: string
): Promise<boolean> => {
  try {
    await Linking.openURL(scheme);
    return true;
  } catch (error: any) {
    // 에러 발생 시 플랫폼별 스토어로 이동
    try {
      let storeUrl: string;
      if (Platform.OS === 'ios') {
        // iOS: 앱스토어로 이동
        storeUrl = appStoreUrl || playStoreUrl;
      } else {
        // Android: 플레이스토어로 이동
        storeUrl = playStoreUrl;
      }
      await Linking.openURL(storeUrl);
    } catch (storeError) {
      // 스토어 열기 실패
    }
    return false;
  }
};
