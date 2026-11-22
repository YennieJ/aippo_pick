import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import { useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * 화면 조회(screen_view) 기록 — Firebase Analytics(GA4, 무료).
 *
 * - 사용자가 어느 화면까지 들어가는지(홈 → 달력 → 종목 상세 → AI 리포트 …) 보기 위한 용도.
 * - 화면 이름은 라우트 "패턴"만 보낸다. 예) /ipo/[codeId]
 *   → 종목 코드·검색어·개인 정보는 보내지 않는다.
 * - 분석 실패가 앱 동작에 영향을 주지 않도록 모든 호출을 조용히 무시(catch)한다.
 * - 광고 ID는 쓰지 않는다(firebase.json, Podfile 설정).
 */

/** 라우트 세그먼트 → 화면 이름. 그룹 폴더 "(tabs)"는 빼고, 빈 경로는 홈으로. */
export function toScreenName(segments: readonly string[]): string {
  const parts = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  if (parts.length === 0) return '/';
  return '/' + parts.join('/');
}

export function useScreenTracking(): void {
  const segments = useSegments();
  const screenName = toScreenName(segments);
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (lastSent.current === screenName) return;
    lastSent.current = screenName;

    try {
      logEvent(getAnalytics(), 'screen_view', {
        screen_name: screenName,
        screen_class: screenName,
      }).catch(() => {});
    } catch {
      // 분석 SDK 문제로 앱이 멈추지 않게 무시
    }
  }, [screenName]);
}
