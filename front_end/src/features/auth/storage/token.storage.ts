import * as SecureStore from 'expo-secure-store';

/**
 * 액세스 토큰 전용 저장소.
 *
 * 토큰은 민감 정보이므로 AsyncStorage(평문) 대신
 * SecureStore(iOS Keychain / Android EncryptedSharedPreferences)에 저장한다.
 *
 * 주의: SecureStore는 앱 컨텍스트에서만 동작하는 비동기 API이며,
 * 네이티브 재빌드가 필요하다.
 */

const ACCESS_TOKEN_KEY = 'access_token';

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
