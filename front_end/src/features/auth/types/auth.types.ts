export interface SocialLoginRequest {
  provider: 'kakao' | 'apple';
  idToken: string;
  deviceId: string;
  /** Apple 최초 로그인 시에만 SDK가 내려주는 표시 이름 */
  nickname?: string;
  /**
   * Apple authorizationCode. 백엔드가 refresh_token으로 교환해 저장해두고,
   * 회원 탈퇴 시 Apple 토큰 폐기(/auth/revoke)에 사용한다.
   */
  authorizationCode?: string;
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
