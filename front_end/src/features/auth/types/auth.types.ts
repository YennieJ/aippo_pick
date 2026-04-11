export interface SocialLoginRequest {
  provider: 'kakao';
  idToken: string;
  deviceId: string;
}

export interface AuthUser {
  userId: string;
  provider: string;
  email: string;
  nickname: string;
}

export interface SocialLoginResponse {
  accessToken: string;
  user: AuthUser;
}
