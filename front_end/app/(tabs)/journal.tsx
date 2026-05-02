import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthGate, useKakaoLogin, useMe } from '../../src/features/auth';
import {
  formatKrw,
  formatPnlText,
  groupRecordsByMonth,
  JournalRecordSheet,
  pnlColor,
  useJournalRecords,
  useJournalYears,
  type JournalRecordListItem,
} from '../../src/features/journal';
import { SectionHeader } from '../../src/shared';

type SheetState =
  | { mode: 'create' }
  | { mode: 'edit'; record: JournalRecordListItem }
  | null;

function JournalLoggedInBody() {
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetState>(null);
  const didAutoOpenLatestYear = useRef(false);

  const {
    data: yearSummaries,
    isLoading: yearsLoading,
    isRefetching: yearsRefetching,
    refetch: refetchYears,
  } = useJournalYears();

  // 최초 1회만 가장 최신 연도 펼침 (사용자가 전부 접어도 다시 강제로 열지 않음)
  useEffect(() => {
    if (!yearSummaries?.length || didAutoOpenLatestYear.current) return;
    didAutoOpenLatestYear.current = true;
    setOpenYears(new Set([yearSummaries[0].연도]));
  }, [yearSummaries]);

  const toggleYear = useCallback((year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const toggleMonth = useCallback((monthKey: string) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  const handleSaved = useCallback(
    ({ year, monthKey }: { year: number; monthKey: string }) => {
      setOpenYears((prev) => new Set(prev).add(year));
      setOpenMonths((prev) => new Set(prev).add(monthKey));
    },
    [],
  );

  const onRefresh = useCallback(async () => {
    await refetchYears();
  }, [refetchYears]);

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 pb-2">
        <SectionHeader title="공모주 매매일지" />
        <TouchableOpacity
          onPress={() => setSheet({ mode: 'create' })}
          activeOpacity={0.85}
          className="flex-row items-center gap-1 rounded-full bg-gray-900 px-3.5 py-2 dark:bg-white"
          style={{ marginBottom: 16 }}
        >
          <Text className="text-sm font-bold text-white dark:text-gray-900">
            + 기록 추가
          </Text>
        </TouchableOpacity>
      </View>

      {yearsLoading && !yearSummaries?.length ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={yearsRefetching} onRefresh={onRefresh} />
          }
        >
          {(yearSummaries ?? []).map((y) => (
            <YearAccordion
              key={y.연도}
              year={y.연도}
              종목수={y.종목수}
              손익합계={y.손익합계}
              isOpen={openYears.has(y.연도)}
              onToggleYear={() => toggleYear(y.연도)}
              openMonths={openMonths}
              onToggleMonth={toggleMonth}
              onEditRecord={(record) => setSheet({ mode: 'edit', record })}
            />
          ))}
          {!yearSummaries?.length && (
            <View className="py-16 items-center gap-2">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                저장된 기록이 없습니다.
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500 text-center">
                공모주 청약 후 매도하셨나요?{'\n'}+ 기록 추가 버튼으로 수익을 기록해보세요!
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <JournalRecordSheet
        visible={sheet != null}
        mode={sheet?.mode ?? 'create'}
        initial={sheet?.mode === 'edit' ? sheet.record : undefined}
        onClose={() => setSheet(null)}
        onSaved={handleSaved}
      />
    </View>
  );
}

type YearAccordionProps = {
  year: number;
  종목수: number;
  손익합계: number;
  isOpen: boolean;
  onToggleYear: () => void;
  openMonths: Set<string>;
  onToggleMonth: (monthKey: string) => void;
  onEditRecord: (r: JournalRecordListItem) => void;
};

function YearAccordion({
  year,
  종목수,
  손익합계,
  isOpen,
  onToggleYear,
  openMonths,
  onToggleMonth,
  onEditRecord,
}: YearAccordionProps) {
  /** 펼친 연도는 레코드 쿼리가 이미 있으므로, 헤더도 레코드의 손익 합과 항상 일치시킨다(/years 지연·불일치 방지). */
  const { data: recordRows } = useJournalRecords(isOpen ? year : null);
  const header종목수 = useMemo(() => {
    if (!isOpen || recordRows === undefined) return 종목수;
    return recordRows.length;
  }, [isOpen, recordRows, 종목수]);
  const header손익합계 = useMemo(() => {
    if (!isOpen || recordRows === undefined) return 손익합계;
    return recordRows.reduce((acc, r) => acc + r.손익금, 0);
  }, [isOpen, recordRows, 손익합계]);

  return (
    <View className="mb-2 rounded-xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggleYear}
        className="px-4 py-3.5 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-base text-gray-500">{isOpen ? '▼' : '▶'}</Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {year}년
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {header종목수}종목
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-gray-500 dark:text-gray-400">수익금</Text>
          <Text
            className="text-base font-bold"
            style={{ color: pnlColor(header손익합계) }}
          >
            {formatKrw(header손익합계)}
          </Text>
        </View>
      </TouchableOpacity>

      {isOpen && (
        <YearBody
          year={year}
          openMonths={openMonths}
          onToggleMonth={onToggleMonth}
          onEditRecord={onEditRecord}
        />
      )}
    </View>
  );
}

type YearBodyProps = {
  year: number;
  openMonths: Set<string>;
  onToggleMonth: (monthKey: string) => void;
  onEditRecord: (r: JournalRecordListItem) => void;
};

function YearBody({ year, openMonths, onToggleMonth, onEditRecord }: YearBodyProps) {
  const { data, isLoading } = useJournalRecords(year);
  const sections = useMemo(
    () => groupRecordsByMonth(data ?? [], year),
    [data, year],
  );

  if (isLoading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View className="py-6 items-center">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          기록이 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <View className="border-t border-gray-100 dark:border-gray-800">
      {sections.map((s) => {
        const opened = openMonths.has(s.monthKey);
        return (
          <View key={s.monthKey}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onToggleMonth(s.monthKey)}
              className="px-4 py-3 flex-row items-center justify-between border-t border-gray-100 dark:border-gray-800"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-sm text-gray-400">
                  {opened ? '▼' : '▶'}
                </Text>
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {s.month}월
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {s.종목수}종목
                </Text>
              </View>
              <Text
                className="text-sm font-semibold"
                style={{ color: pnlColor(s.pnlSum) }}
              >
                {formatKrw(s.pnlSum)}
              </Text>
            </TouchableOpacity>

            {opened &&
              s.rows.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.7}
                  onPress={() => onEditRecord(r)}
                  className="px-6 py-2.5 flex-row items-center justify-between border-t border-gray-50 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-900/60"
                >
                  <View className="shrink pr-2">
                    <Text className="text-[15px] font-medium text-gray-900 dark:text-white">
                      {r.종목명}
                    </Text>
                  </View>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: pnlColor(r.손익금) }}
                  >
                    {formatPnlText(r.손익금, r.수익률)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        );
      })}
    </View>
  );
}

export default function JournalScreen() {
  const { isAuthReady } = useAuthGate();
  const { data: me } = useMe();
  const kakaoLoginMutation = useKakaoLogin();
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  if (!isAuthReady) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        edges={['top']}
      >
        <View className="pt-3" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={['top']}
    >
      <View className="pt-3" />

      {me ? (
        <JournalLoggedInBody />
      ) : (
        <View className="flex-1 items-center justify-center px-4 gap-4">
          <Text className="text-sm text-center text-gray-600 dark:text-gray-400">
            로그인 하면 매매일지를 사용할 수 있습니다.
          </Text>
          <TouchableOpacity
            className="w-full items-center rounded-lg bg-[#FED45C] py-3 dark:bg-[#D4A72C]"
            onPress={() => setIsLoginModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-black dark:text-white">
              로그인 하기
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isLoginModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsLoginModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setIsLoginModalVisible(false)}
          />
          <View className="rounded-t-[20px] bg-white px-5 pb-10 pt-8 dark:bg-gray-800">
            <TouchableOpacity
              className={`items-center rounded-lg bg-[#FEE500] py-3.5 ${kakaoLoginMutation.isPending ? 'opacity-60' : ''}`}
              activeOpacity={0.8}
              disabled={kakaoLoginMutation.isPending}
              onPress={() => {
                kakaoLoginMutation.mutate(undefined, {
                  onSuccess: () => {
                    setIsLoginModalVisible(false);
                  },
                });
              }}
            >
              <Text className="text-base font-bold text-[#191919]">
                {kakaoLoginMutation.isPending
                  ? '로그인 중...'
                  : '카카오톡으로 로그인하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
