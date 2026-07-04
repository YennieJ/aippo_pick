import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getAllBrokers,
  getBrokerRanking,
  getIpoByCodeId,
  getIpoCalendar,
  getIpoScore,
  getTodayIpo,
  searchAndResolve,
} from '../api/ipo';

export function useTodayIpo() {
  return useQuery({
    queryKey: ['ipo', 'today'],
    queryFn: getTodayIpo,
  });
}

export function useIpoCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['ipo', 'calendar', startDate, endDate],
    queryFn: () => getIpoCalendar(startDate, endDate),
  });
}

export function useBrokerRanking(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['ipo', 'broker', 'ranking', startDate, endDate],
    queryFn: () => getBrokerRanking(startDate, endDate),
  });
}

/**
 * 홈 화면과 동일한 "최근 1년" 범위로 증권사 순위를 조회.
 * 홈(app/(tabs)/index.tsx)의 날짜 포맷(YYYY.MM.DD)과 일치 → 같은 queryKey.
 * 스플래시에서 prefetch하면 홈이 캐시를 그대로 재사용해 추가 로딩이 사라진다.
 */
function getRecentYearRange() {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fmt = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };
  return { startDate: fmt(oneYearAgo), endDate: fmt(today) };
}

export function useBrokerRankingRecentYear() {
  const { startDate, endDate } = getRecentYearRange();
  return useBrokerRanking(startDate, endDate);
}

export function useAllBrokers() {
  return useQuery({
    queryKey: ['ipo', 'broker', 'all'],
    queryFn: getAllBrokers,
  });
}

export function useIpoByCodeId(codeId: string) {
  return useQuery({
    queryKey: ['ipo', 'detail', codeId],
    queryFn: () => getIpoByCodeId(codeId),
    enabled: !!codeId, // codeId가 있을 때만 쿼리 실행
  });
}

export function useIpoSearch(keyword: string) {
  const trimmedKeyword = keyword.trim();
  return useQuery({
    queryKey: ['ipo', 'search', trimmedKeyword],
    queryFn: () => searchAndResolve(trimmedKeyword),
    enabled: trimmedKeyword.length > 0, // 키워드가 있을 때만 쿼리 실행
  });
}

export function useIpoDetailsByIds(codeIds: string[]) {
  return useQueries({
    queries: codeIds.map((codeId) => ({
      queryKey: ['ipo', 'detail', codeId],
      queryFn: () => getIpoByCodeId(codeId),
      enabled: !!codeId,
    })),
  });
}

export function useIpoScore(company: string) {
  return useQuery({
    queryKey: ['ipo', 'score', company],
    queryFn: () => getIpoScore(company),
    enabled: !!company,
  });
}
