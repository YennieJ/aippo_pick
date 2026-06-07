import type * as AppleAuthentication from 'expo-apple-authentication';

/** 사용자가 Apple 로그인 시트를 닫은 경우 */
export function isAppleLoginCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'ERR_REQUEST_CANCELED'
  );
}

/** Apple "내 이메일 가리기" 선택 시 발급되는 비공개 릴레이 주소인지 판별 */
export function isPrivateRelayEmail(email?: string | null): boolean {
  return (
    !!email && email.trim().toLowerCase().endsWith('@privaterelay.appleid.com')
  );
}

/** 화면 표시용 이메일. 비공개 릴레이 주소면 "비공개 이메일"로 대체 */
export function formatDisplayEmail(email?: string | null): string {
  if (!email) return '';
  return isPrivateRelayEmail(email) ? '비공개 이메일' : email;
}

/** Apple은 최초 로그인에만 fullName을 내려준다. */
export function formatAppleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): string | undefined {
  if (!fullName) return undefined;

  const name = [fullName.familyName, fullName.givenName]
    .filter(Boolean)
    .join('')
    .trim();

  return name || undefined;
}
