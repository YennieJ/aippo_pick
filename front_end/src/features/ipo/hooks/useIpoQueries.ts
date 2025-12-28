import { useQueries, useQuery } from '@tanstack/react-query';
import {
  getAllBrokers,
  getBrokerRanking,
  getIpoByCodeId,
  getIpoCalendar,
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
