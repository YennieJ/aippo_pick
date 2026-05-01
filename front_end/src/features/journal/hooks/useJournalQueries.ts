import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  createJournalRecord,
  deleteJournalRecord,
  fetchJournalRecordsByYear,
  fetchJournalYears,
  searchIpoStocks,
  updateJournalRecord,
} from '../api/journal.api';
import type {
  JournalRecordListItem,
  JournalRecordWriteBody,
  JournalStockMaster,
  JournalYearSummary,
} from '../types/journal.types';

/** RQ v5 일부 조합에서 `data: never`로 추론되는 케이스 방어용 */
type RQData<T> = Omit<UseQueryResult<T, Error>, 'data'> & {
  data: T | undefined;
};

export function useJournalYears(): RQData<JournalYearSummary[]> {
  return useQuery({
    queryKey: ['journal', 'years'],
    queryFn: fetchJournalYears,
  }) as RQData<JournalYearSummary[]>;
}

export function useJournalRecords(
  year: number | null,
): RQData<JournalRecordListItem[]> {
  return useQuery({
    queryKey: ['journal', 'records', year],
    queryFn: () => fetchJournalRecordsByYear(year!),
    enabled: year != null,
  }) as RQData<JournalRecordListItem[]>;
}

export function useJournalCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JournalRecordWriteBody) => createJournalRecord(body),
    onSuccess: async () => {
      // `/years` 집계가 레코드보다 늦게 반영되거나, invalidate만으로 리패치가
      // 스킵되는 케이스가 있어 연도 요약은 refetchQueries로 강제한다.
      await Promise.all([
        qc.refetchQueries({ queryKey: ['journal', 'years'] }),
        qc.refetchQueries({ queryKey: ['journal', 'records'] }),
      ]);
      await qc.invalidateQueries({
        queryKey: ['journal', 'stocks'],
        refetchType: 'active',
      });
    },
  });
}

export function useJournalUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: JournalRecordWriteBody;
    }) => updateJournalRecord(id, body),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['journal', 'years'] }),
        qc.refetchQueries({ queryKey: ['journal', 'records'] }),
      ]);
      await qc.invalidateQueries({
        queryKey: ['journal', 'stocks'],
        refetchType: 'active',
      });
    },
  });
}

export function useJournalDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJournalRecord(id),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['journal', 'years'] }),
        qc.refetchQueries({ queryKey: ['journal', 'records'] }),
      ]);
      await qc.invalidateQueries({
        queryKey: ['journal', 'stocks'],
        refetchType: 'active',
      });
    },
  });
}

export function useJournalStockSearch(
  q: string,
  enabled: boolean,
): {
  items: JournalStockMaster[];
  isLoading: boolean;
  isFetching: boolean;
  errorMessage?: string;
} {
  const keyword = (q ?? '').trim();
  const [acc, setAcc] = useState<JournalStockMaster[]>([]);

  // keyword 변경 시 결과 초기화
  useEffect(() => {
    setAcc([]);
  }, [keyword]);

  const query = useQuery({
    queryKey: ['journal', 'stocks', keyword],
    enabled,
    queryFn: () => searchIpoStocks({ keyword }),
  });

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setAcc(() => data.items);
  }, [query.data]);

  // 모달을 닫았다가 다시 열면 query.data는 캐시에 남아 "값이 바뀌지" 않을 수 있다.
  // 이 경우 query.data effect가 다시 실행되지 않아 acc가 빈 배열로 남는 문제가 있어,
  // enabled가 true로 전환될 때 캐시 데이터를 즉시 반영한다.
  useEffect(() => {
    if (!enabled) return;
    if (query.data) {
      setAcc(query.data.items);
    }
  }, [enabled, query.data]);

  const errorMessage = useMemo(() => {
    if (!query.error) return undefined;
    const anyErr = query.error as any;
    const status = anyErr?.response?.status;
    const message =
      anyErr?.response?.data?.message ??
      anyErr?.message ??
      '검색 요청에 실패했습니다.';
    return status ? `(${status}) ${String(message)}` : String(message);
  }, [query.error]);

  return {
    items: acc,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    errorMessage,
  };
}
