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

export const getMe = async (): Promise<AuthUser> => {
  const token = await getAccessToken();
  const response = await api.get<AuthUser>('/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
