import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { clearAccessToken } from '../../features/auth/storage/token.storage';

const PRODUCTION_API_URL = 'https://api.aippopick.shop';

/**
 * API Base URL 결정 로직
 *
 * 우선순위:
 * 1. 프로덕션 빌드(__DEV__ === false)에서 값이 누락되었거나
 *    HTTP/로컬 주소가 남아있으면 무조건 프로덕션 URL로 고정 (안전망)
 * 2. 개발 빌드에서 `localhost`/`127.0.0.1`이 지정된 경우
 *    → Android만 `10.0.2.2`로 자동 치환 (에뮬레이터에서 호스트 Mac 접근)
 * 3. 그 외는 설정 값을 그대로 사용
 *
 * 이렇게 하면 .env에 localhost가 남아있어도 프로덕션 빌드가 localhost로
 * 요청을 보내는 사고가 발생하지 않는다.
 */
function resolveApiBaseUrl(): string {
  const rawUrl =
    Constants.expoConfig?.extra?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    PRODUCTION_API_URL;

  // 프로덕션 빌드 안전망: HTTPS가 아니거나 로컬/사설 IP를 가리키면 강제 교체
  if (!__DEV__) {
    const isHttps = rawUrl.startsWith('https://');
    const pointsToLocal =
      /(?:localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|10\.)/.test(
        rawUrl,
      );

    if (!isHttps || pointsToLocal) {
      if (__DEV__) {
        // 개발 중이 아니니 이 블록은 실제로 실행되지 않지만 의도를 명시
        console.warn('[api] falling back to production URL');
      }
      return PRODUCTION_API_URL;
    }
    return rawUrl;
  }

  // 개발 모드: Android 에뮬레이터에서만 localhost → 10.0.2.2 치환
  if (Platform.OS === 'android') {
    return rawUrl
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }

  return rawUrl;
}

const apiBaseUrl = resolveApiBaseUrl();

// 401 자동 로그아웃 시 React Query 캐시를 정리하기 위한 주입 포인트
// _layout.tsx에서 registerQueryClient(queryClient) 호출로 세팅한다.
let queryClientRef: QueryClient | null = null;
export function registerQueryClient(client: QueryClient) {
  queryClientRef = client;
}

// 로그인 요청 자체의 401은 "세션 만료"가 아니라 "로그인 실패"이므로 제외
const AUTH_BYPASS_PATHS = ['/auth/social-login'];

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  // 웹 환경에서 CORS 오류 방지
  ...(Platform.OS === 'web' && {
    withCredentials: false,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    const isBypass = AUTH_BYPASS_PATHS.some((path) => url.includes(path));

    if (status === 401 && !isBypass) {
      // 조용히 로컬 상태만 정리 → useMe() 구독 컴포넌트가 자동 리렌더되어
      // 자연스럽게 "로그인 하기" 버튼으로 전환된다.
      //
      // ⚠️ invalidateQueries는 절대 호출하면 안 됨.
      // /auth/me가 401을 돌려주는 상황에서 invalidate하면 곧바로 재요청 → 또 401 →
      // 인터셉터가 다시 발동 → 무한 루프가 된다. setQueryData만으로 충분하다.
      try {
        await clearAccessToken();
        await AsyncStorage.removeItem('USER');
        queryClientRef?.setQueryData(['auth', 'me'], null);
      } catch {}
    }

    return Promise.reject(error);
  },
);

