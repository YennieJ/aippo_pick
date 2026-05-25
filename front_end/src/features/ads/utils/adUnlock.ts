import {
  STORAGE_KEYS,
  loadString,
  saveString,
} from '@/src/shared/utils/storage.utils';

/**
 * KST(Asia/Seoul) 기준 오늘 날짜 YYYY-MM-DD 문자열
 */
export const todayKST = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

/**
 * 오늘 광고를 시청해 AI 리포트가 해제된 상태인지 확인
 */
export const isUnlockedToday = async (): Promise<boolean> => {
  const last = await loadString(STORAGE_KEYS.AD_REWARD_LAST_DATE);
  return last === todayKST();
};

/**
 * 오늘 광고 시청 완료를 기록
 */
export const markUnlockedToday = async (): Promise<void> => {
  await saveString(STORAGE_KEYS.AD_REWARD_LAST_DATE, todayKST());
};
