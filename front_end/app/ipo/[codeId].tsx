import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIpoByCodeId } from '../../src/features/ipo/hooks/useIpoQueries';
import { IpoDetailData } from '../../src/features/ipo/types/ipo.types';
import { DeepLinkButton, IconSymbol } from '../../src/shared';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';
import {
  loadStringArray,
  saveStringArray,
  STORAGE_KEYS,
} from '../../src/shared/utils/storage.utils';

export default function IpoDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { codeId } = useLocalSearchParams<{ codeId: string }>();
  const { data, isLoading, error } = useIpoByCodeId(codeId || '');
  const codeIdStr = Array.isArray(codeId) ? codeId[0] : (codeId ?? '');

  // 즐겨찾기 훅은 조건문보다 "무조건 위에"
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // API 응답은 배열로 반환됨
  const ipoData: IpoDetailData | undefined = Array.isArray(data)
    ? data[0]
    : data;

  // codeId(혹은 ipoData?.code_id)를 키로 사용
  const favoriteKey = ipoData?.code_id ?? codeId ?? '';

  // 상세 데이터가 준비되면 최근 본 공모주에 기록
  useEffect(() => {
    if (!codeIdStr) return;
    if (!data) return; // 데이터 없으면 기록 X

    // 최근 본 공모주 추가 (최대 10개)
    const addRecentIpo = async () => {
      try {
        const current = await loadStringArray(STORAGE_KEYS.RECENT_IPO);
        const next = [
          codeIdStr,
          ...current.filter((id) => id !== codeIdStr),
        ].slice(0, 10);
        await saveStringArray(STORAGE_KEYS.RECENT_IPO, next);
      } catch (e) {
        console.log('addRecentIpo error', e);
      }
    };
    addRecentIpo();
  }, [codeIdStr, data]);

  // ✅ 2) 즐겨찾기 상태 로드
  useEffect(() => {
    if (!favoriteKey) return;

    loadStringArray(STORAGE_KEYS.FAVORITES).then((list) => {
      setFavorites(list);
      setIsFavorite(list.includes(favoriteKey));
    });
  }, [favoriteKey]);

  const onToggleFavorite = async () => {
    if (!favoriteKey) return;

    const current = await loadStringArray(STORAGE_KEYS.FAVORITES);
    const exists = current.includes(favoriteKey);
    const next = exists
      ? current.filter((id) => id !== favoriteKey)
      : [...current, favoriteKey];
    await saveStringArray(STORAGE_KEYS.FAVORITES, next);
    setFavorites(next);
    setIsFavorite(next.includes(favoriteKey));
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-black"
        edges={['bottom']}
      >
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#1A1A1A'} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-black"
        edges={['bottom']}
      >
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-red-600 dark:text-red-400 text-center">
            데이터를 불러오는 중 오류가 발생했습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ipoData) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-black"
        edges={['bottom']}
      >
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-red-600 dark:text-red-400 text-center">
            데이터 없음
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // D-day 계산
  const calculateDday = (dateString: string): number | null => {
    if (!dateString) return null;
    const normalizedDate = dateString.split('~')[0].trim().replace(/\./g, '-');
    const targetDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 상태 및 D-day 결정
  const getStatusInfo = () => {
    if (ipoData.subscriptiondate) {
      const dday = calculateDday(ipoData.subscriptiondate);
      if (dday !== null && dday >= 0) {
        return { status: '청약중', dday, color: '#F87171' };
      }
    }
    if (ipoData.listingdate) {
      const dday = calculateDday(ipoData.listingdate);
      if (dday !== null && dday >= 0) {
        return { status: '상장', dday, color: '#F87171' };
      }
    }
    if (ipoData.refunddate) {
      const dday = calculateDday(ipoData.refunddate);
      if (dday !== null && dday >= 0) {
        return { status: '환불', dday, color: '#34D399' };
      }
    }
    return null;
  };

  const statusInfo = getStatusInfo();
  const ddayText =
    statusInfo?.dday !== undefined
      ? statusInfo.dday > 0
        ? `D-${statusInfo.dday}`
        : statusInfo.dday === 0
          ? 'D-Day'
          : `D+${Math.abs(statusInfo.dday)}`
      : '';

  // 현재가: price → confirmedprice → desiredprice
  const currentPrice =
    ipoData.price && ipoData.price !== '-'
      ? ipoData.price
      : ipoData.confirmedprice && ipoData.confirmedprice !== '-원'
        ? ipoData.confirmedprice
        : ipoData.desiredprice || null;

  const priceLabel =
    ipoData.price && ipoData.price !== '-'
      ? '현재가'
      : ipoData.confirmedprice && ipoData.confirmedprice !== '-원'
        ? '확정 공모가'
        : ipoData.desiredprice
          ? '희망 공모가'
          : '현재가';

  // 청약 경쟁률: competitionrate → institutional_competition_rate
  const competitionRate =
    ipoData.competitionrate && ipoData.competitionrate !== ''
      ? ipoData.competitionrate
      : ipoData.institutional_competition_rate || null;

  const competitionLabel =
    ipoData.competitionrate && ipoData.competitionrate !== ''
      ? '청약 경쟁률'
      : ipoData.institutional_competition_rate
        ? '기관 경쟁률'
        : '청약 경쟁률';

  // 오늘이 상장일인지 확인
  const isListingToday = () => {
    if (!ipoData.listingdate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const listingDateStr = ipoData.listingdate
      .split('~')[0]
      .trim()
      .replace(/\./g, '-');
    const listingDate = new Date(listingDateStr);
    listingDate.setHours(0, 0, 0, 0);
    return today.getTime() === listingDate.getTime();
  };

  const showRealTimeUpdate = isListingToday();

  // 날짜가 지났는지 확인 (오늘 포함)
  const isDatePassed = (dateString: string): boolean => {
    if (!dateString) return false;
    const normalizedDate = dateString.split('~')[0].trim().replace(/\./g, '-');
    const targetDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() <= today.getTime();
  };

  // 수요예측일이 미정이고 오늘이 청약일인지 확인
  const shouldCheckForecastDate = (): boolean => {
    if (!ipoData.forecastdate || ipoData.forecastdate === '미정') {
      // 수요예측일이 미정이고, 오늘이 청약일이면 체크
      if (ipoData.subscriptiondate) {
        const normalizedDate = ipoData.subscriptiondate
          .split('~')[0]
          .trim()
          .replace(/\./g, '-');
        const subscriptionDate = new Date(normalizedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        subscriptionDate.setHours(0, 0, 0, 0);
        return subscriptionDate.getTime() <= today.getTime();
      }
      return false;
    }
    return isDatePassed(ipoData.forecastdate);
  };

  // 증권사 파싱 (쉼표로 구분)
  const underwriters = ipoData.underwriter
    ? ipoData.underwriter.split(',').map((u) => u.trim())
    : [];

  // 산업 분류 추출 (industry에서)
  const industry = ipoData.industry || '';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {/* Level 1: 헤더 영역 */}
        <View className="mb-2 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* 회사명, 즐겨찾기, 상태 배지 */}
          <View className="flex-row items-start justify-between mb-2.5">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {ipoData.company}
              </Text>
              {statusInfo && (
                <View
                  className="self-start px-3.5 py-1.5 rounded-2xl border-2 bg-white dark:bg-gray-800"
                  style={{ borderColor: statusInfo.color }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: statusInfo.color }}
                  >
                    {statusInfo.status} {ddayText}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onToggleFavorite}
              className="px-2 py-1 justify-center items-center"
            >
              <Text className="text-[28px] font-black text-amber-500">
                {isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Level 2: 회사 소개 */}
        {industry && (
          <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2.5">
              회사 소개
            </Text>
            <Text className="text-[15px] text-gray-800 dark:text-gray-200 leading-[22px]">
              {industry}
            </Text>
          </View>
        )}

        {/* Level 3: 주요 정보 카드 (2열) */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex-row gap-4 shadow-sm">
          {/* 왼쪽: 현재가/확정 공모가/희망 공모가 */}
          <View className="flex-1 border-r border-gray-100 dark:border-gray-700 pr-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
              {priceLabel}
            </Text>
            {currentPrice ? (
              <Text className="text-[28px] font-bold text-gray-900 dark:text-white mb-1">
                {currentPrice}
              </Text>
            ) : (
              <Text className="text-[28px] font-bold text-gray-900 dark:text-white mb-1">
                -
              </Text>
            )}
            {showRealTimeUpdate && (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                실시간 업데이트 중
              </Text>
            )}
          </View>

          {/* 오른쪽: 청약 경쟁률/기관 경쟁률 */}
          <View className="flex-1">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
              {competitionLabel}
            </Text>
            {competitionRate ? (
              <Text className="text-[28px] font-bold text-emerald-500 dark:text-emerald-400 mb-1">
                {competitionRate}
              </Text>
            ) : (
              <Text className="text-[28px] font-bold text-emerald-500 dark:text-emerald-400 mb-1">
                -
              </Text>
            )}
          </View>
        </View>

        {/* Level 4: 상세 정보 카드들 */}
        {/* 청약 가능한 증권사 */}
        {underwriters.length > 0 && (
          <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2.5">
              청약 가능한 증권사
            </Text>
            {underwriters.map((broker, index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700"
              >
                <View className="flex-1 mr-3">
                  <Text className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                    {broker}
                  </Text>
                  <Text className="text-[13px] text-gray-600 dark:text-gray-400">
                    수수료: 1,500원
                  </Text>
                </View>
                <DeepLinkButton
                  brokerName={broker}
                  style={{
                    backgroundColor: '#4A90E2',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  textStyle={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* 일정 */}
        <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2.5">
            일정
          </Text>
          <View className="relative">
            <View className="flex-row items-start py-3 gap-3">
              <View className="items-center relative">
                <View className="w-6 h-6 items-center justify-center mt-0.5 z-[1] bg-white dark:bg-gray-800">
                  {shouldCheckForecastDate() ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol
                      name="circle"
                      size={24}
                      color={isDark ? '#4B5563' : '#E5E5E5'}
                    />
                  )}
                </View>
                <View
                  className="absolute top-[26px] left-[11px] w-0.5 bg-gray-200 dark:bg-gray-700 z-0"
                  style={{ height: '100%' }}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] text-gray-900 dark:text-white font-semibold">
                    수요예측일
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    ({ipoData.forecastdate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-start py-3 gap-3">
              <View className="items-center relative">
                <View className="w-6 h-6 items-center justify-center mt-0.5 z-[1] bg-white dark:bg-gray-800">
                  {ipoData.subscriptiondate &&
                  isDatePassed(ipoData.subscriptiondate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol
                      name="circle"
                      size={24}
                      color={isDark ? '#4B5563' : '#E5E5E5'}
                    />
                  )}
                </View>
                <View
                  className="absolute top-[26px] left-[11px] w-0.5 bg-gray-200 dark:bg-gray-700 z-0"
                  style={{ height: '100%' }}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] text-gray-900 dark:text-white font-semibold">
                    청약일
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    ({ipoData.subscriptiondate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-start py-3 gap-3">
              <View className="items-center relative">
                <View className="w-6 h-6 items-center justify-center mt-0.5 z-[1] bg-white dark:bg-gray-800">
                  {ipoData.refunddate && isDatePassed(ipoData.refunddate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol
                      name="circle"
                      size={24}
                      color={isDark ? '#4B5563' : '#E5E5E5'}
                    />
                  )}
                </View>
                <View
                  className="absolute top-[26px] left-[11px] w-0.5 bg-gray-200 dark:bg-gray-700 z-0"
                  style={{ height: '100%' }}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] text-gray-900 dark:text-white font-semibold">
                    환불일
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    ({ipoData.refunddate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-start py-3 gap-3 pb-0">
              <View className="items-center relative">
                <View className="w-6 h-6 items-center justify-center mt-0.5 z-[1] bg-white dark:bg-gray-800">
                  {ipoData.listingdate && isDatePassed(ipoData.listingdate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol
                      name="circle"
                      size={24}
                      color={isDark ? '#4B5563' : '#E5E5E5'}
                    />
                  )}
                </View>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] text-gray-900 dark:text-white font-semibold">
                    상장일
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    ({ipoData.listingdate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 공모 정보 */}
        <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2.5">
            공모 정보
          </Text>
          <View className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <View className="flex-row justify-between items-center py-3 px-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                시가총액
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.market_cap && ipoData.market_cap !== ''
                  ? ipoData.market_cap
                  : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                상장주식수
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.listed_shares && ipoData.listed_shares !== ''
                  ? ipoData.listed_shares
                  : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                총공모주식수
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.totalnumber ? ipoData.totalnumber : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                기관경쟁률
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.institutional_competition_rate &&
                ipoData.institutional_competition_rate !== ''
                  ? ipoData.institutional_competition_rate
                  : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                유통비율
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.circulation_ratio && ipoData.circulation_ratio !== ''
                  ? ipoData.circulation_ratio
                  : '-'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 px-3 bg-gray-50 dark:bg-gray-900">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium flex-1">
                의무보유확약
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold flex-1 text-right">
                {ipoData.mandatoryretention &&
                ipoData.mandatoryretention !== '0.00%'
                  ? ipoData.mandatoryretention
                  : '-'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
