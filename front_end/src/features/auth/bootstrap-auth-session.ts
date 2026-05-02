import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

import { getMe } from './api/auth';
import { AUTH_USER_STORAGE_KEY } from './constants';
import { clearAccessToken, getAccessToken } from './storage/token.storage';
import type { AuthUser } from './types/auth.types';

const ME_QUERY_KEY = ['auth', 'me'] as const;

/**
 * 앱 기동 시 1회: SecureStore 토큰 + 로컬 프로필 캐시로 시드 후,
 * 토큰이 있으면 /auth/me 로 검증(실패 시 로컬·캐시 정리).
 * 이후 탭 화면의 useMe()는 동일 queryKey 로 즉시 일관된 상태를 본다.
 */
export async function bootstrapAuthSession(
  queryClient: QueryClient,
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    queryClient.setQueryData(ME_QUERY_KEY, null);
    return;
  }

  const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (raw) {
    try {
      const user = JSON.parse(raw) as AuthUser;
      queryClient.setQueryData(ME_QUERY_KEY, user);
    } catch {
      // 손상된 캐시는 무시하고 서버 검증만 진행
    }
  }

  try {
    const me = await getMe();
    queryClient.setQueryData(ME_QUERY_KEY, me);
  } catch {
    await clearAccessToken();
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    queryClient.setQueryData(ME_QUERY_KEY, null);
  }
}
