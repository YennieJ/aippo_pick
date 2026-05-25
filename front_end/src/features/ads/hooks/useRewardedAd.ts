import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { REWARDED_AI_REPORT_AD_UNIT_ID } from '../constants';
import { markUnlockedToday } from '../utils/adUnlock';

/**
 * 보상형 광고 로드/표시/보상 처리 훅
 *
 * 사용법:
 *   const { isLoaded, showAd } = useRewardedAd();
 *   const ok = await showAd(); // 보상 수령 성공 시 true
 */
export const useRewardedAd = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  const adRef = useRef(
    RewardedAd.createForAdRequest(REWARDED_AI_REPORT_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  /** 광고 시청 중 결과를 외부로 전달하기 위한 resolver */
  const resolveRef = useRef<((earned: boolean) => void) | null>(null);
  /** 이번 시청에서 보상을 받았는지 (CLOSED 시 판정용) */
  const earnedRef = useRef(false);

  const loadAd = useCallback(() => {
    setIsLoaded(false);
    earnedRef.current = false;
    try {
      if (__DEV__) console.log('[ads] load() called');
      adRef.current.load();
    } catch (e) {
      if (__DEV__) console.log('[ads] load() threw', e);
    }
  }, []);

  useEffect(() => {
    const ad = adRef.current;

    const unsubLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        if (__DEV__) console.log('[ads] LOADED');
        setIsLoaded(true);
      }
    );

    const unsubEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        if (__DEV__) console.log('[ads] EARNED_REWARD');
        earnedRef.current = true;
        // 보상 시점에 즉시 영구 기록 (사용자가 광고 닫기 전에라도 해제 보장)
        void markUnlockedToday();
      }
    );

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      if (__DEV__) console.log('[ads] CLOSED, earned=', earnedRef.current);
      const earned = earnedRef.current;
      if (resolveRef.current) {
        resolveRef.current(earned);
        resolveRef.current = null;
      }
      // 다음 광고를 미리 로드
      loadAd();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      if (__DEV__) console.log('[ads] ERROR', error);
      setIsLoaded(false);
      if (resolveRef.current) {
        resolveRef.current(false);
        resolveRef.current = null;
      }
    });

    loadAd();

    return () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };
  }, [loadAd]);

  /**
   * 광고를 노출하고 보상 수령 여부를 반환한다.
   * - 로드 전이라면 false 반환
   */
  const showAd = useCallback((): Promise<boolean> => {
    if (__DEV__) console.log('[ads] showAd() called, isLoaded=', isLoaded);
    if (!isLoaded) {
      // 로드되지 않았으면 즉시 false + 백그라운드 재로드
      loadAd();
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      earnedRef.current = false;
      try {
        adRef.current.show();
      } catch (e) {
        if (__DEV__) console.log('[ads] show() threw', e);
        resolveRef.current = null;
        resolve(false);
      }
    });
  }, [isLoaded, loadAd]);

  return { isLoaded, showAd };
};
