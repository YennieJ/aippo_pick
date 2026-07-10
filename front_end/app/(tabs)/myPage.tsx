import { useFocusEffect, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import messaging from '@react-native-firebase/messaging';
import {
  useAllBrokers,
  useIpoDetailsByIds,
} from '../../src/features/ipo/hooks/useIpoQueries';
import { IpoDetailData } from '../../src/features/ipo/types/ipo.types';
import {
  loadStringArray,
  removeItem,
  saveStringArray,
  STORAGE_KEYS,
} from '../../src/shared/utils/storage.utils';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  formatDisplayEmail,
  useAuthGate,
  useLogout,
  useMe,
} from '../../src/features/auth';

// const AUTH_GOOGLE_V1 = 'AUTH_GOOGLE_V1';

import {
  convert24To12,
  NotificationFilterSheet,
  NotificationToggleRow,
  TimePickerSheet,
  useNotificationSetting,
  useUpdateNotificationSetting,
} from '../../src/features/myPage';
import { cn } from '../../src/lib/cn';
import {
  ConfirmDialog,
  IconSymbol,
  IpoStatusBadge,
  SectionHeader,
  SocialLoginButtons,
} from '../../src/shared';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';
import { getStableDeviceId } from '../../src/shared/utils/device-id.utils';

// 소셜 프로바이더별 라벨/색상 매핑
function getProviderTheme(provider: string) {
  switch (provider.toLowerCase()) {
    case 'kakao':
      return { label: '카카오', bgColor: '#FEE500', textColor: '#191919' };
    case 'google':
      return { label: '구글', bgColor: '#FFFFFF', textColor: '#111111' };
    case 'apple':
      return { label: '애플', bgColor: '#000000', textColor: '#FFFFFF' };
    default:
      return { label: provider, bgColor: '#9CA3AF', textColor: '#FFFFFF' };
  }
}

export default function MyPageScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9CA3AF' : '#111827';

  const { isAuthReady } = useAuthGate();
  // 내 정보 조회 (세션 부트스트랩 후에만 네트워크 — 루트 AuthGateProvider 가 선행)
  const { data: me } = useMe();

  // 로그아웃 mutation
  const logoutMutation = useLogout();

  // 문자열("24,650", " 8,000원") → 숫자로 안전하게 변환
  const parseNumber = (value?: string | null): number | null => {
    if (!value) return null;

    // 숫자, -, . 만 남기고 다 제거
    const cleaned = value.replace(/[^\d.-]/g, '').trim();
    if (!cleaned) return null;

    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  // 🔔 알림 설정 리액트 쿼리
  const { data: notificationSetting, isLoading: notificationLoading } =
    useNotificationSetting();
  const updateNotificationMutation = useUpdateNotificationSetting();

  // 🔔 전체 알림 스위치 상태 (서버 데이터로 초기화)

  const [notifyAll, setNotifyAll] = useState(false);
  const [notifySpac, setNotifySpac] = useState(true);
  const [notifyReits, setNotifyReits] = useState(true);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);

  // 🔔 설정 가능한 알람 시각 3종
  const [morningAlarmTime, setMorningAlarmTime] = useState('08:00');
  const [aiReportAlarmTime, setAiReportAlarmTime] = useState('08:00');
  const [weeklyAlarmTime, setWeeklyAlarmTime] = useState('08:00');

  // 🔔 알림 종류별 개별 On/Off (기본값 true)
  const [notifyMorning, setNotifyMorning] = useState(true);
  const [notifySubStart, setNotifySubStart] = useState(true);
  const [notifySubEnd, setNotifySubEnd] = useState(true);
  const [notifyAiReport, setNotifyAiReport] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);

  // 🔔 포커스드 시트 상태 — 시간 시트는 어느 알림을 편집 중인지 타깃으로 관리
  const [timeSheetTarget, setTimeSheetTarget] = useState<
    'morning' | 'aiReport' | 'weekly' | null
  >(null);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);

  // 증권사 목록
  const { data: allBrokers = [] } = useAllBrokers();

  // 🔔 권한 확인 및 요청
  async function ensureNotificationPermission() {
    const authStatus = await messaging().hasPermission();

    // 이미 허용된 경우
    if (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    // 아직 결정되지 않은 경우 → OS 권한 다이얼로그 표시
    if (authStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
      const newStatus = await messaging().requestPermission();
      return (
        newStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        newStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    // 거부된 경우 → 설정 앱으로 안내
    setIsPermissionDialogVisible(true);
    return false;
  }

  // 🔔 알림 설정 업데이트 함수
  const handleUpdateNotification = useCallback(
    async (updates: {
      notifyAll?: boolean;
      spac?: boolean;
      reits?: boolean;
      morningAlarmTime?: string;
      aiReportAlarmTime?: string;
      weeklyAlarmTime?: string;
      broker?: string;
      notifyMorning?: boolean;
      notifySubStart?: boolean;
      notifySubEnd?: boolean;
      notifyAiReport?: boolean;
      notifyWeekly?: boolean;
    }) => {
      const deviceId = await getStableDeviceId();
      const currentSetting = notificationSetting;

      const requestBody = {
        deviceId,
        notifyAll: updates.notifyAll ?? currentSetting?.notifyAll ?? false,
        broker: updates.broker ?? currentSetting?.broker ?? '',
        spac: updates.spac ?? currentSetting?.spac ?? true,
        reits: updates.reits ?? currentSetting?.reits ?? true,
        morningAlarmTime:
          updates.morningAlarmTime ??
          currentSetting?.morningAlarmTime ??
          '08:00',
        aiReportAlarmTime:
          updates.aiReportAlarmTime ??
          currentSetting?.aiReportAlarmTime ??
          '08:00',
        weeklyAlarmTime:
          updates.weeklyAlarmTime ??
          currentSetting?.weeklyAlarmTime ??
          '08:00',
        notifyMorning:
          updates.notifyMorning ?? currentSetting?.notifyMorning ?? true,
        notifySubStart:
          updates.notifySubStart ?? currentSetting?.notifySubStart ?? true,
        notifySubEnd:
          updates.notifySubEnd ?? currentSetting?.notifySubEnd ?? true,
        notifyAiReport:
          updates.notifyAiReport ?? currentSetting?.notifyAiReport ?? true,
        notifyWeekly:
          updates.notifyWeekly ?? currentSetting?.notifyWeekly ?? true,
      };
      await updateNotificationMutation.mutateAsync(requestBody);
    },
    [notificationSetting, updateNotificationMutation],
  );

  // 🔔 통합 필터 시트 "적용" → 종목(포함값)·증권사 한번에 저장
  const handleApplyFilter = useCallback(
    async (spac: boolean, reits: boolean, brokers: string[]) => {
      setNotifySpac(spac);
      setNotifyReits(reits);
      setSelectedBrokers(brokers);
      await handleUpdateNotification({
        spac,
        reits,
        broker: brokers.length === 0 ? '' : brokers.join(','),
      });
    },
    [handleUpdateNotification],
  );

  // 🔔 시간 시트 "완료" → 편집 중인 타깃 필드에 즉시 저장
  const handleConfirmTime = useCallback(
    async (time24: string) => {
      if (timeSheetTarget === 'morning') {
        setMorningAlarmTime(time24);
        await handleUpdateNotification({ morningAlarmTime: time24 });
      } else if (timeSheetTarget === 'aiReport') {
        setAiReportAlarmTime(time24);
        await handleUpdateNotification({ aiReportAlarmTime: time24 });
      } else if (timeSheetTarget === 'weekly') {
        setWeeklyAlarmTime(time24);
        await handleUpdateNotification({ weeklyAlarmTime: time24 });
      }
    },
    [timeSheetTarget, handleUpdateNotification],
  );

  // 🔔 시간 칩 렌더 (오늘의 공모주 / AI 리포트 / 이번 주 요약 공통)
  const renderTimeChip = useCallback(
    (timeValue: string, target: 'morning' | 'aiReport' | 'weekly') => (
      <TouchableOpacity
        className="flex-row items-center gap-1 mr-2.5 px-3 py-1.5 rounded-[10px] bg-gray-100 dark:bg-gray-700"
        activeOpacity={notifyAll ? 0.7 : 1}
        disabled={!notifyAll}
        onPress={notifyAll ? () => setTimeSheetTarget(target) : undefined}
      >
        <MaterialIcons name="schedule" size={15} color={iconColor} />
        <Text className="text-[13px] font-bold text-gray-700 dark:text-gray-200">
          {(() => {
            const t = convert24To12(timeValue);
            return `${t.period === 'AM' ? '오전' : '오후'} ${t.hour}:${t.minute
              .toString()
              .padStart(2, '0')}`;
          })()}
        </Text>
      </TouchableOpacity>
    ),
    [notifyAll, iconColor],
  );

  // 🔔 증권사 시트 "완료" → 즉시 저장 (빈 배열 = 전체 = '')
  // ⭐⭐⭐ 그 다음이 기존 Hook들 시작 영역
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isLogoutConfirmVisible, setIsLogoutConfirmVisible] = useState(false);
  const [isPermissionDialogVisible, setIsPermissionDialogVisible] =
    useState(false);
  const [infoDialog, setInfoDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // 리액트 쿼리로 즐겨찾기 상세 가져오기
  const favoriteQueries = useIpoDetailsByIds(favorites);
  const favoriteLoading = favoriteQueries.some((q) => q.isLoading);

  // favorites 배열 순서대로 정렬
  const favoriteDetailsMap = new Map<string, IpoDetailData>();
  favoriteQueries.forEach((query, index) => {
    if (query.data && favorites[index]) {
      const detail: IpoDetailData | undefined = Array.isArray(query.data)
        ? query.data[0]
        : query.data;
      if (detail) {
        favoriteDetailsMap.set(favorites[index], detail);
      }
    }
  });

  const favoriteDetails: IpoDetailData[] = [...favorites]
    .reverse() // 최신순
    .map((id) => favoriteDetailsMap.get(id))
    .filter((item): item is IpoDetailData => item !== undefined);

  // 리액트 쿼리로 최근 본 상세 가져오기
  const recentQueries = useIpoDetailsByIds(recentIds);
  const recentLoading = recentQueries.some((q) => q.isLoading);

  // recentIds 배열 순서대로 정렬
  const recentDetailsMap = new Map<string, IpoDetailData>();
  recentQueries.forEach((query, index) => {
    if (query.data && recentIds[index]) {
      const detail: IpoDetailData | undefined = Array.isArray(query.data)
        ? query.data[0]
        : query.data;
      if (detail) {
        recentDetailsMap.set(recentIds[index], detail);
      }
    }
  });

  const recentDetails: IpoDetailData[] = recentIds
    .map((id) => recentDetailsMap.get(id))
    .filter((item): item is IpoDetailData => item !== undefined);

  const isFavorite = useCallback(
    (ipoId: string) => favorites.includes(ipoId),
    [favorites],
  );

  // 스크롤뷰 ref
  const scrollViewRef = useRef<ScrollView>(null);

  // 탭 포커스시 즐겨찾기 + 최근 본 동시 로딩
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // 스크롤을 최상단으로 이동
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      const load = async () => {
        try {
          const [favoriteList, recentList] = await Promise.all([
            loadStringArray(STORAGE_KEYS.FAVORITES),
            loadStringArray(STORAGE_KEYS.RECENT_IPO),
          ]);
          if (cancelled) return;

          if (__DEV__) {
            console.log('⭐ MyPage favorites:', favoriteList);
            console.log('👀 MyPage recent:', recentList);
          }

          setFavorites(favoriteList);
          setRecentIds(recentList);
        } catch (e) {
          if (__DEV__) {
            console.log('MyPage load error', e);
          }
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  // 알림 설정 데이터가 로드되면 상태 업데이트
  useEffect(() => {
    if (notificationSetting) {
      setNotifyAll(notificationSetting.notifyAll === true);
      if (typeof notificationSetting.spac === 'boolean') {
        setNotifySpac(notificationSetting.spac);
      }
      if (typeof notificationSetting.reits === 'boolean') {
        setNotifyReits(notificationSetting.reits);
      }
      if (notificationSetting.morningAlarmTime) {
        setMorningAlarmTime(notificationSetting.morningAlarmTime);
      }
      if (notificationSetting.aiReportAlarmTime) {
        setAiReportAlarmTime(notificationSetting.aiReportAlarmTime);
      }
      if (notificationSetting.weeklyAlarmTime) {
        setWeeklyAlarmTime(notificationSetting.weeklyAlarmTime);
      }
      if (notificationSetting.broker) {
        setSelectedBrokers(
          notificationSetting.broker
            .split(',')
            .filter((b) => b.trim().length > 0),
        );
      }
      if (typeof notificationSetting.notifyMorning === 'boolean') {
        setNotifyMorning(notificationSetting.notifyMorning);
      }
      if (typeof notificationSetting.notifySubStart === 'boolean') {
        setNotifySubStart(notificationSetting.notifySubStart);
      }
      if (typeof notificationSetting.notifySubEnd === 'boolean') {
        setNotifySubEnd(notificationSetting.notifySubEnd);
      }
      if (typeof notificationSetting.notifyAiReport === 'boolean') {
        setNotifyAiReport(notificationSetting.notifyAiReport);
      }
      if (typeof notificationSetting.notifyWeekly === 'boolean') {
        setNotifyWeekly(notificationSetting.notifyWeekly);
      }
    }
  }, [notificationSetting]);

  // 최근 본 전체 삭제
  const onClearRecent = useCallback(async () => {
    try {
      await removeItem(STORAGE_KEYS.RECENT_IPO);
      setRecentIds([]);
    } catch (e) {
      if (__DEV__) {
        console.log('onClearRecent error', e);
      }
    }
  }, []);

  // 즐겨찾기 전체 삭제
  const onClearFavorites = useCallback(async () => {
    try {
      await removeItem(STORAGE_KEYS.FAVORITES);
      setFavorites([]);
    } catch (e) {
      if (__DEV__) {
        console.log('onClearFavorites error', e);
      }
    }
  }, []);

  // 최근 본 한 줄 삭제
  const onRemoveRecent = useCallback(async (ipoId: string) => {
    try {
      const current = await loadStringArray(STORAGE_KEYS.RECENT_IPO);
      const next = current.filter((id) => id !== ipoId);
      await saveStringArray(STORAGE_KEYS.RECENT_IPO, next);
      setRecentIds((prev) => prev.filter((id) => id !== ipoId));
    } catch (e) {
      if (__DEV__) {
        console.log('onRemoveRecent error', e);
      }
    }
  }, []);

  // 즐겨찾기 토글
  const onToggleFavorite = useCallback(
    async (ipoId: string) => {
      const existsNow = favorites.includes(ipoId);
      const nextIds = existsNow
        ? favorites.filter((id) => id !== ipoId)
        : [...favorites, ipoId];

      // 스토리지에 저장
      await saveStringArray(STORAGE_KEYS.FAVORITES, nextIds);
      setFavorites(nextIds);
    },
    [favorites],
  );

  // 홈 카드처럼 가격(현재가/공모가) 결정
  const getDisplayPrice = useCallback(
    (item: IpoDetailData) => {
      const priceNum = parseNumber(item.price ?? null);
      const confirmedPriceNum = parseNumber(item.confirmedprice ?? null);

      const displayPrice =
        priceNum !== null
          ? priceNum
          : confirmedPriceNum !== null
            ? confirmedPriceNum
            : null;

      const priceLabel = priceNum !== null ? '현재가' : '공모가';

      return { displayPrice, priceLabel };
    },
    [parseNumber],
  );

  if (!isAuthReady) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-1 bg-white dark:bg-black">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-white dark:bg-black"
        >
          {/* 헤더 */}
          <View className="pt-5">
            <SectionHeader title="My 페이지" />
          </View>

          <View className="px-4 pb-4">
            {me ? (
              (() => {
                const providerTheme = getProviderTheme(me.provider);
                return (
                  <View className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-2 shadow-sm">
                    {/* 이름 / 이메일 */}
                    <Text
                      className="text-lg font-bold text-gray-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {me.nickname}
                    </Text>
                    <Text
                      className="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
                      numberOfLines={1}
                    >
                      {formatDisplayEmail(me.email)}
                    </Text>

                    {/* 구분선 */}
                    <View className="h-px bg-gray-200 dark:bg-gray-700 my-3" />

                    {/* 프로바이더 + 로그아웃 */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="h-2 w-2 rounded-full mr-2"
                          style={{ backgroundColor: providerTheme.bgColor }}
                        />
                        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {providerTheme.label} 계정으로 로그인됨
                        </Text>
                      </View>
                      <Pressable
                        disabled={logoutMutation.isPending}
                        onPress={() => setIsLogoutConfirmVisible(true)}
                        hitSlop={16}
                        className="py-2 px-3 -my-2 -mr-2 rounded-md"
                        android_ripple={{
                          color: 'rgba(0,0,0,0.1)',
                          borderless: false,
                        }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline">
                          {logoutMutation.isPending
                            ? '로그아웃 중...'
                            : '로그아웃'}
                        </Text>
                      </Pressable>
                    </View>

                  </View>
                );
              })()
            ) : (
              <>
                <TouchableOpacity
                  className="items-center rounded-lg bg-[#FED45C] py-3 mb-2 dark:bg-[#D4A72C]"
                  onPress={() => setIsLoginModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text className="text-base font-bold text-black dark:text-white">
                    로그인 하기
                  </Text>
                </TouchableOpacity>
                <Text className="text-sm text-center text-gray-600 dark:text-gray-400">
                  로그인 하면 매도 일지를 사용할 수 있습니다.
                </Text>
              </>
            )}
          </View>
          <View className="pb-6">
            <View className="pb-4 px-4 flex-row items-center gap-2.5">
              <MaterialIcons name="notifications" size={20} color={iconColor} />
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                알림 설정
              </Text>
            </View>
            <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* 전체 알림 */}
              <View className="min-h-[54px] px-4 py-3 flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center flex-1">
                  <Text className="text-[15px] text-gray-900 dark:text-white font-bold">
                    전체 알림
                  </Text>
                </View>

                <Switch
                  value={notifyAll}
                  onValueChange={async (newValue) => {
                    if (newValue === true) {
                      const ok = await ensureNotificationPermission();
                      if (!ok) return;
                    }

                    setNotifyAll(newValue);
                    await handleUpdateNotification({ notifyAll: newValue });
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#5B9FFF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* 1·2 청약 이벤트 — 행동 가능·최상단, 시간 고정 */}
              <NotificationToggleRow
                title="청약 시작"
                subtitle="청약일 오전 10:00"
                value={notifySubStart}
                disabled={!notifyAll}
                onValueChange={async (v) => {
                  setNotifySubStart(v);
                  await handleUpdateNotification({ notifySubStart: v });
                }}
              />
              <NotificationToggleRow
                title="청약 마감"
                subtitle="마감일 오후 3:30"
                value={notifySubEnd}
                disabled={!notifyAll}
                onValueChange={async (v) => {
                  setNotifySubEnd(v);
                  await handleUpdateNotification({ notifySubEnd: v });
                }}
              />
              {/* 3 오늘의 공모주 — 평일 브리핑, 시각 지정 */}
              <NotificationToggleRow
                title="오늘의 공모주"
                subtitle="평일 브리핑"
                value={notifyMorning}
                disabled={!notifyAll}
                onValueChange={async (v) => {
                  setNotifyMorning(v);
                  await handleUpdateNotification({ notifyMorning: v });
                }}
                rightAccessory={renderTimeChip(morningAlarmTime, 'morning')}
              />
              {/* 4 AI 리포트 — 매일, 시각 지정 */}
              <NotificationToggleRow
                title="AI 리포트 완성"
                subtitle="매일"
                value={notifyAiReport}
                disabled={!notifyAll}
                onValueChange={async (v) => {
                  setNotifyAiReport(v);
                  await handleUpdateNotification({ notifyAiReport: v });
                }}
                rightAccessory={renderTimeChip(aiReportAlarmTime, 'aiReport')}
              />
              {/* 5 이번 주 요약 — 매주 월요일, 시각 지정 */}
              <NotificationToggleRow
                title="이번 주 요약"
                subtitle="매주 월요일"
                value={notifyWeekly}
                disabled={!notifyAll}
                onValueChange={async (v) => {
                  setNotifyWeekly(v);
                  await handleUpdateNotification({ notifyWeekly: v });
                }}
                rightAccessory={renderTimeChip(weeklyAlarmTime, 'weekly')}
              />

              {/* 필터 — 달력과 동일한 통합 바텀시트(조회 종목 제외 + 증권사) */}
              <TouchableOpacity
                className={`min-h-[54px] px-4 py-3 flex-row justify-between items-center ${
                  !notifyAll ? 'opacity-50' : ''
                }`}
                activeOpacity={notifyAll ? 0.7 : 1}
                disabled={!notifyAll}
                onPress={
                  notifyAll ? () => setIsFilterSheetVisible(true) : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    notifyAll
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-300'
                  }`}
                >
                  필터
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      const brokerPart =
                        selectedBrokers.length === 0
                          ? '전체 증권사'
                          : `증권사 ${selectedBrokers.length}개`;
                      const ex: string[] = [];
                      if (!notifySpac) ex.push('스펙');
                      if (!notifyReits) ex.push('리츠');
                      return ex.length
                        ? `${brokerPart} · ${ex.join('·')} 제외`
                        : brokerPart;
                    })()}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={iconColor}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View className="pb-6">
            <View className="pb-4 px-4 flex-row justify-between items-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                ⭐ 즐겨찾기 공모주
              </Text>
              <TouchableOpacity
                onPress={onClearFavorites}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5 px-3 py-1.5"
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={iconColor}
                />
                <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  전체삭제
                </Text>
              </TouchableOpacity>
            </View>
            {favoriteLoading && favoriteDetails.length === 0 ? (
              <View className="py-4 px-4">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  즐겨찾기 정보를 불러오는 중입니다.
                </Text>
              </View>
            ) : favoriteDetails.length === 0 ? (
              <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                <View className="py-4 px-4">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    즐겨찾기한 공모주가 없습니다.
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    공모주 상세 화면에서 ⭐ 버튼을 눌러 즐겨찾기를 추가해보세요.
                  </Text>
                </View>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 12,
                }}
              >
                {favoriteDetails.map((item) => {
                  const id = item.code_id;
                  const favorite = isFavorite(id);
                  const { displayPrice, priceLabel } = getDisplayPrice(item);

                  const rate =
                    item.competitionrate ??
                    item.institutional_competition_rate ??
                    null;

                  return (
                    <TouchableOpacity
                      key={id}
                      className="w-[228px] rounded-2xl px-3.5 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      style={{ height: 180 }}
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: '/ipo/[codeId]',
                          params: { codeId: id },
                        })
                      }
                    >
                      <View className="flex-1 justify-between">
                        {/* 헤더 영역 (고정 높이) */}
                        <View style={{ height: 70 }}>
                          {/* 타이틀과 별표시 */}
                          <View className="flex-row items-start justify-between mb-2.5">
                            <Text
                              className="text-[15px] font-black text-gray-900 dark:text-gray-100 flex-1 mr-2"
                              numberOfLines={2}
                            >
                              {item.company}
                            </Text>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(id);
                              }}
                              hitSlop={{
                                top: 6,
                                bottom: 6,
                                left: 6,
                                right: 6,
                              }}
                              className="px-1 pt-0.5 justify-center items-center"
                            >
                              <IconSymbol
                                name={favorite ? 'star.fill' : 'star'}
                                size={22}
                                color="#FACC15"
                              />
                            </TouchableOpacity>
                          </View>

                          {/* 뱃지 */}
                          <View>
                            <IpoStatusBadge
                              subscriptiondate={item.subscriptiondate}
                              listingdate={item.listingdate}
                              refunddate={item.refunddate}
                              size="small"
                            />
                          </View>
                        </View>

                        {/* 데이터 영역 */}
                        <View className="flex-1 justify-center">
                          {/* 가격 */}
                          <View className="flex-row items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                            <Text className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                              {priceLabel}
                            </Text>
                            <Text className="text-xs text-gray-900 dark:text-gray-100 font-black">
                              {displayPrice !== null
                                ? `${displayPrice.toLocaleString()}원`
                                : '-'}
                            </Text>
                          </View>

                          {/* 경쟁률 */}
                          <View className="flex-row items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                            <Text className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                              경쟁률
                            </Text>
                            <Text
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-black"
                              numberOfLines={1}
                            >
                              {rate || '-'}
                            </Text>
                          </View>
                        </View>

                        {/* 자세히 보기 (항상 맨 아래 고정) */}
                        <View className="pt-2.5 border-t border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
                          <Text className="text-xs text-gray-600 dark:text-gray-400 font-extrabold">
                            자세히 보기
                          </Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={18}
                            color={iconColor}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View className="pb-6">
            <View className="pb-4 px-4 flex-row justify-between items-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                👀 최근 본 공모주
              </Text>
              <TouchableOpacity
                onPress={onClearRecent}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5 px-3 py-1.5"
              >
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color={iconColor}
                />
                <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  전체삭제
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
              {recentLoading && recentDetails.length === 0 ? (
                <View className="py-4 px-4">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    최근 본 공모주를 불러오는 중입니다.
                  </Text>
                </View>
              ) : recentDetails.length === 0 ? (
                <View className="py-4 px-4">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    최근 본 공모주가 없습니다.
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    공모주 상세 화면에 들어가면 여기에서 바로 확인할 수 있어요.
                  </Text>
                </View>
              ) : (
                recentDetails.map((item, idx) => {
                  const isLast = idx === recentDetails.length - 1;

                  return (
                    <TouchableOpacity
                      key={item.code_id}
                      className={cn(
                        'min-h-[54px] px-4 py-3 flex-row items-center justify-between gap-2',
                        !isLast &&
                          'border-b border-gray-200 dark:border-gray-700',
                      )}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: '/ipo/[codeId]',
                          params: { codeId: item.code_id },
                        })
                      }
                    >
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.company}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-2.5">
                        <TouchableOpacity
                          onPress={() => onRemoveRecent(item.code_id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          activeOpacity={0.8}
                        >
                          <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            삭제
                          </Text>
                        </TouchableOpacity>
                        <MaterialIcons
                          name="chevron-right"
                          size={22}
                          color={iconColor}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          <View className="pb-6 px-4 flex-row items-center justify-center">
            <TouchableOpacity
              onPress={() => router.push('/termAndConditions')}
              activeOpacity={0.7}
            >
              <Text className="text-xs text-gray-600 dark:text-gray-400 underline">
                약관 및 개인정보 처리방침
              </Text>
            </TouchableOpacity>
            {me && (
              <>
                <Text className="text-xs text-gray-300 dark:text-gray-600 mx-2">
                  |
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/withdraw')}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-600 dark:text-gray-400 underline">
                    회원 탈퇴
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>

      {/* 로그인 모달 */}
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
            <SocialLoginButtons
              onSuccess={() => setIsLoginModalVisible(false)}
              onError={(e) => {
                setInfoDialog({
                  title: '로그인 실패',
                  message: e.message ?? '알 수 없는 에러',
                });
              }}
            />
          </View>
        </View>
      </Modal>

      {/* 알림 설정 모달 */}
      <TimePickerSheet
        visible={timeSheetTarget !== null}
        title={
          timeSheetTarget === 'morning'
            ? '오늘의 공모주 · 알림 시각'
            : timeSheetTarget === 'aiReport'
              ? 'AI 리포트 · 알림 시각'
              : '이번 주 요약 · 알림 시각'
        }
        initialTime={
          timeSheetTarget === 'aiReport'
            ? aiReportAlarmTime
            : timeSheetTarget === 'weekly'
              ? weeklyAlarmTime
              : morningAlarmTime
        }
        onClose={() => setTimeSheetTarget(null)}
        onConfirm={handleConfirmTime}
      />

      <NotificationFilterSheet
        visible={isFilterSheetVisible}
        allBrokers={allBrokers}
        initialSpac={notifySpac}
        initialReits={notifyReits}
        initialBrokers={selectedBrokers}
        onClose={() => setIsFilterSheetVisible(false)}
        onApply={handleApplyFilter}
      />

      {/* 로그아웃 확인 다이얼로그 */}
      <ConfirmDialog
        visible={isLogoutConfirmVisible}
        title="로그아웃"
        message={'정말 로그아웃 하시겠습니까?\n로그아웃 시 매매 일지를 사용할 수 없습니다.'}
        confirmText="로그아웃"
        destructive
        onConfirm={() => {
          setIsLogoutConfirmVisible(false);
          logoutMutation.mutate();
        }}
        onCancel={() => setIsLogoutConfirmVisible(false)}
      />

      {/* 알림 권한 필요 다이얼로그 (설정 앱 이동) */}
      <ConfirmDialog
        visible={isPermissionDialogVisible}
        title="알림 권한 필요"
        message={'알림이 꺼져 있습니다.\n설정에서 알림을 켜주세요.'}
        confirmText="설정으로 이동"
        onConfirm={() => {
          setIsPermissionDialogVisible(false);
          Linking.openSettings();
        }}
        onCancel={() => setIsPermissionDialogVisible(false)}
      />

      {/* 정보/에러 알림 다이얼로그 (1버튼) */}
      <ConfirmDialog
        visible={infoDialog !== null}
        title={infoDialog?.title ?? ''}
        message={infoDialog?.message}
        confirmText="확인"
        hideCancel
        onConfirm={() => setInfoDialog(null)}
      />
    </SafeAreaView>
  );
}
