import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as kakaoLogin,
  logout as kakaoLogout,
} from '@react-native-seoul/kakao-login';
import { getMe, logout, socialLogin } from '../api/auth';
import {
  clearAccessToken,
  setAccessToken,
} from '../storage/token.storage';
import { getStableDeviceId } from '../../../shared/utils/device-id.utils';
import { SocialLoginResponse } from '../types/auth.types';

// 유저 프로필은 민감 정보가 아니므로 AsyncStorage 유지 (SecureStore는 토큰 전용)
const USER_KEY = 'USER';

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
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

      // 로그인 직후 /auth/me 캐시에 즉시 반영 → UI가 바로 업데이트
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
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
      // 1. UI를 즉시 로그아웃 상태로 전환 (Optimistic)
      //    - 로컬 저장소 정리
      //    - React Query 캐시에서 로그인 정보 제거 → useMe() 구독 컴포넌트 리렌더
      queryClient.setQueryData(['auth', 'me'], null);
      await clearAccessToken();
      await AsyncStorage.removeItem(USER_KEY);

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
