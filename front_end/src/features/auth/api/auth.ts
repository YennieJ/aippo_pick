import { isAxiosError } from 'axios';
import { api } from '../../../shared/api/client';
import { getAccessToken } from '../storage/token.storage';
import {
  AuthUser,
  SocialLoginRequest,
  SocialLoginResponse,
} from '../types/auth.types';

export const socialLogin = async (
  data: SocialLoginRequest,
): Promise<SocialLoginResponse> => {
  const response = await api.post<SocialLoginResponse>(
    '/auth/social-login',
    data,
  );
  return response.data;
};

/**
 * 토큰이 없으면 API를 호출하지 않고 `null`을 반환.
 * (로그아웃 직후 등) `queryFn`이 401로 실패하면 React Query가
 * “마지막 성공 fetch”로 이전 사용자를 복원하는 동작을 피하기 위함.
 */
export const getMe = async (): Promise<AuthUser | null> => {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const response = await api.get<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const logout = async (deviceId: string): Promise<void> => {
  const token = await getAccessToken();
  await api.post(
    '/auth/logout',
    { deviceId },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
};

/** 카카오 연결 해제 + 서버 사용자/매매일지 삭제. 204 또는 404(이미 삭제) 모두 성공으로 처리 */
export const withdrawAccount = async (): Promise<void> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('세션이 없습니다.');
  }
  try {
    await api.delete('/auth/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      return;
    }
    throw e;
  }
};
