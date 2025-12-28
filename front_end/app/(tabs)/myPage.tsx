import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Notifications from 'expo-notifications';

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
  convert24To12,
  getStableDeviceId,
  NotificationSettingModal,
  useNotificationSetting,
  useUpdateNotificationSetting,
} from '../../src/features/myPage';
import { cn } from '../../src/lib/cn';
import { IconSymbol, IpoStatusBadge, SectionHeader } from '../../src/shared';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

export default function MyPageScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9CA3AF' : '#111827';

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
  const [alarmTime, setAlarmTime] = useState('08:00');
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);

  // 🔔 알림 설정 모달 상태
  const [isNotificationModalVisible, setIsNotificationModalVisible] =
    useState(false);
  // 모달 내 임시 상태
  const [tempNotifySpac, setTempNotifySpac] = useState(true);
  const [tempNotifyReits, setTempNotifyReits] = useState(true);
  const [tempAlarmTime, setTempAlarmTime] = useState('08:00');
  const [tempSelectedBrokers, setTempSelectedBrokers] = useState<string[]>([]);

  // 증권사 목록
  const { data: allBrokers = [] } = useAllBrokers();

  // 🔔 권한 확인 및 요청
  async function ensureNotificationPermission() {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        '알림 권한 필요',
        '알림을 받으려면 권한이 필요합니다.\n설정에서 알림을 켜주세요.'
      );
      return false;
    }
    return true;
  }

  // 🔔 알림 설정 업데이트 함수
  const handleUpdateNotification = useCallback(
    async (updates: {
      notifyAll?: boolean;
      spac?: boolean;
      reits?: boolean;
      alarmTime?: string;
      broker?: string;
    }) => {
      const deviceId = await getStableDeviceId();
      const currentSetting = notificationSetting;

      await updateNotificationMutation.mutateAsync({
        deviceId,
        notifyAll: updates.notifyAll ?? currentSetting?.notifyAll ?? false,
        broker: updates.broker ?? currentSetting?.broker ?? '',
        spac: updates.spac ?? currentSetting?.spac ?? true,
        reits: updates.reits ?? currentSetting?.reits ?? true,
        alarmTime: updates.alarmTime ?? currentSetting?.alarmTime ?? '08:00',
      });
    },
    [notificationSetting, updateNotificationMutation]
  );

  // 🔔 모달 열기 (모달이 열릴 때마다 현재 시간을 12시간 형식으로 변환하여 초기화)
  const openNotificationModal = useCallback(() => {
    setTempNotifySpac(notifySpac);
    setTempNotifyReits(notifyReits);
    setTempAlarmTime(alarmTime);
    setTempSelectedBrokers([...selectedBrokers]);
    setIsNotificationModalVisible(true);
  }, [notifySpac, notifyReits, alarmTime, selectedBrokers]);

  // 🔔 모달 닫기
  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalVisible(false);
  }, []);

  // 🔔 모달 내 증권사 토글
  const toggleBroker = useCallback((brokerName: string) => {
    setTempSelectedBrokers((prev) => {
      if (prev.includes(brokerName)) {
        return prev.filter((name) => name !== brokerName);
      } else {
        return [...prev, brokerName];
      }
    });
  }, []);

  // 🔔 모달 내 전체 선택 리셋
  const resetToAll = useCallback(() => {
    setTempSelectedBrokers([]);
  }, []);

  // 🔔 모달 적용
  const applyNotificationSettings = useCallback(async () => {
    const deviceId = await getStableDeviceId();
    const brokerString =
      tempSelectedBrokers.length === 0 ? '' : tempSelectedBrokers.join(',');
    setNotifySpac(tempNotifySpac);
    setNotifyReits(tempNotifyReits);
    setAlarmTime(tempAlarmTime);
    setSelectedBrokers([...tempSelectedBrokers]);

    await updateNotificationMutation.mutateAsync({
      deviceId,
      notifyAll: notifyAll,
      broker: brokerString,
      spac: tempNotifySpac,
      reits: tempNotifyReits,
      alarmTime: tempAlarmTime,
    });

    setIsNotificationModalVisible(false);
  }, [
    tempNotifySpac,
    tempNotifyReits,
    tempAlarmTime,
    tempSelectedBrokers,
    notifyAll,
    updateNotificationMutation,
  ]);

  // ⭐⭐⭐ 그 다음이 기존 Hook들 시작 영역
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

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
    [favorites]
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
    }, [])
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
      if (notificationSetting.alarmTime) {
        setAlarmTime(notificationSetting.alarmTime);
      }
      if (notificationSetting.broker) {
        setSelectedBrokers(
          notificationSetting.broker
            .split(',')
            .filter((b) => b.trim().length > 0)
        );
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
    [favorites]
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
    [parseNumber]
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <View className="flex-1 bg-white dark:bg-black">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-white dark:bg-black"
        >
          {/* 헤더 */}
          <View className="py-5">
            <SectionHeader title="My 페이지" />
          </View>

          {/* ✅ 알림 설정 */}
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
                  <Text className="text-sm text-gray-900 dark:text-white font-medium">
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

              {/* 상세 설정 */}
              <TouchableOpacity
                className={`min-h-[54px] px-4 py-3 flex-row justify-between items-center ${
                  !notifyAll ? 'opacity-50' : ''
                }`}
                activeOpacity={notifyAll ? 0.8 : 1}
                onPress={notifyAll ? openNotificationModal : undefined}
                disabled={!notifyAll}
              >
                <View className="flex-1">
                  <Text
                    className={`text-sm font-medium mb-1 ${
                      notifyAll
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  >
                    상세 설정
                  </Text>
                  {notifyAll ? (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        시간:{' '}
                        {(() => {
                          const time12 = convert24To12(alarmTime);
                          return `${time12.period === 'AM' ? '오전' : '오후'} ${time12.hour}:${time12.minute.toString().padStart(2, '0')}`;
                        })()}
                      </Text>
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        •
                      </Text>
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedBrokers.length === 0
                          ? '증권사: 전체'
                          : `증권사: ${selectedBrokers.length}개`}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-gray-400 dark:text-gray-600">
                      전체 알림을 켜야 설정할 수 있습니다
                    </Text>
                  )}
                </View>

                {notifyAll && (
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={iconColor}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ⭐ 즐겨찾기 공모주 */}
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
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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

          {/* 👀 최근 본 공모주 */}
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
                          'border-b border-gray-200 dark:border-gray-700'
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

          {/* ⚙️ 앱 설정 */}
          <View className="pb-6 px-4">
            <TouchableOpacity
              onPress={() => router.push('/termAndConditions')}
              activeOpacity={0.7}
              className="items-center"
            >
              <Text className="text-xs text-gray-600 dark:text-gray-400 underline">
                약관 및 개인정보 처리방침
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* 알림 설정 모달 */}
      <NotificationSettingModal
        visible={isNotificationModalVisible}
        onClose={closeNotificationModal}
        allBrokers={allBrokers}
        tempNotifySpac={tempNotifySpac}
        tempNotifyReits={tempNotifyReits}
        tempAlarmTime={tempAlarmTime}
        tempSelectedBrokers={tempSelectedBrokers}
        onToggleSpac={() => setTempNotifySpac(!tempNotifySpac)}
        onToggleReits={() => setTempNotifyReits(!tempNotifyReits)}
        onAlarmTimeChange={setTempAlarmTime}
        onToggleBroker={toggleBroker}
        onResetToAll={resetToAll}
        onApply={applyNotificationSettings}
      />
    </SafeAreaView>
  );
}
