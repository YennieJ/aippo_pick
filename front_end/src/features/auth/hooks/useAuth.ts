import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as kakaoLogin,
  logout as kakaoLogout,
  unlink as kakaoUnlink,
} from '@react-native-seoul/kakao-login';
import { getMe, logout, socialLogin, withdrawAccount } from '../api/auth';
import {
  AUTH_KAKAO_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from '../constants';
import { useAuthGate } from '../context/AuthGateContext';
import {
  clearAccessToken,
  setAccessToken,
} from '../storage/token.storage';
import { getStableDeviceId } from '../../../shared/utils/device-id.utils';
import { type AuthUser, SocialLoginResponse } from '../types/auth.types';

export function useKakaoLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SocialLoginResponse> => {
      // 1. 카카오 로그인 → idToken 획득
      const kakaoResult = await kakaoLogin();

      // 2. idToken 원본을 그대로 백엔드로 전달 (서버가 JWKS로 서명 검증)
      const deviceId = await getStableDeviceId();
      return socialLogin({
        provider: 'kakao',
        idToken: kakaoResult.idToken,
        deviceId,
      });
    },
    onSuccess: async (data) => {
      // 액세스 토큰은 SecureStore에, 프로필은 AsyncStorage에 저장
      await setAccessToken(data.accessToken);
      await AsyncStorage.setItem(
        AUTH_USER_STORAGE_KEY,
        JSON.stringify(data.user),
      );

      // 로그인 직후 /auth/me 캐시에 즉시 반영 → UI가 바로 업데이트
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useMe() {
  const { isAuthReady } = useAuthGate();

  return useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: isAuthReady,
    retry: false,
    // 한 번 값(성공 or 실패)이 정해지면 다시 네트워크로 때리지 않는다.
    // 로그인/로그아웃 시점에만 명시적으로 setQueryData로 갱신한다.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1) 토큰·캐시 먼저 제거 → getMe가 401로 실패해 “이전 사용자 복원” 되지 않게 함
      await clearAccessToken();
      await AsyncStorage.multiRemove([
        AUTH_USER_STORAGE_KEY,
        AUTH_KAKAO_STORAGE_KEY,
      ]);
      // 2) me 캐시를 null로 (queryFn은 토큰 없을 때 null 반환)
      queryClient.setQueryData(['auth', 'me'], null);

      // 2. 서버 로그아웃(FCM 토큰 해제)과 카카오 SDK 세션 정리는 백그라운드에서 진행.
      //    사용자는 여기서 기다릴 필요 없음. 실패해도 이미 로컬은 정리됨.
      const deviceId = await getStableDeviceId();
      void logout(deviceId).catch((e) => {
        console.warn('[logout] server notify failed', e?.message);
      });
      void kakaoLogout().catch(() => {});
    },
  });
}

/** 탈퇴 성공 후 로컬 세션·매매일지 캐시 정리 (API 성공 직후 호출) */
async function finalizeWithdrawLocal(queryClient: QueryClient): Promise<void> {
  await clearAccessToken();
  await AsyncStorage.multiRemove([
    AUTH_USER_STORAGE_KEY,
    AUTH_KAKAO_STORAGE_KEY,
  ]);
  queryClient.setQueryData(['auth', 'me'], null);
  queryClient.removeQueries({ queryKey: ['journal'] });
}

/**
 * DELETE /auth/withdraw 성공 후 로컬 정리 + 카카오 unlink(멱등, 실패 무시).
 * 401/404 등은 mutation에서 reject → 화면에서 라우팅/메시지 처리.
 */
export function useWithdrawAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await withdrawAccount();
      await finalizeWithdrawLocal(queryClient);
      // 서버에서 이미 unlink된 경우 에러가 나와도 무시 (디바이스 SDK 캐시 정리 목적)
      try {
        await kakaoUnlink();
      } catch {
        /* ignore */
      }
    },
  });
}
