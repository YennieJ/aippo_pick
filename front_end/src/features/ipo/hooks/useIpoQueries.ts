import { useQuery } from '@tanstack/react-query';
import {
  getAllBrokers,
  getBrokerRanking,
  getIpoCalendar,
  getTodayIpo,
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
