import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@aippopick/device-id';

let cachedDeviceId: string | null = null;

/**
 * 앱 전용 고정 Device ID
 * - Android: getAndroidId() (하드웨어 고유값, 변하지 않음)
 * - iOS: UUID를 생성해서 AsyncStorage에 영구 저장 (앱 삭제 전까지 유지)
 */
export async function getStableDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  // Android: 하드웨어 고유 ID
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    if (androidId) {
      cachedDeviceId = androidId;
      return androidId;
    }
  }

  // iOS: AsyncStorage에 저장된 UUID 사용
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  // 최초 실행: UUID 생성 후 저장
  const newId = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
}
