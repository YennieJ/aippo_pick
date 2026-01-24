import React, { useEffect, useMemo, useRef, useState } from 'react';

import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAllBrokers,
  useBrokerRanking,
  useTodayIpo,
} from '../../src/features/ipo/hooks/useIpoQueries';
import { cn } from '../../src/lib/cn';
import {
  DeepLinkButton,
  IconSymbol,
  IpoStatusBadge,
  SectionHeader,
} from '../../src/shared';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

const { width } = Dimensions.get('window'); // Get screen width
const isWeb = Platform.OS === 'web';
const ITEM_WIDTH = isWeb ? 400 : width * 0.8; // 웹: 400px, 앱: 화면의 80%
const PADDING = 14; // 양옆 패딩

type RankingType = 'topByCount' | 'topByAvg' | 'topByMax';

export default function HomeScreen() {
  const { data: todayIpo } = useTodayIpo();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
  const [selectedTab2, setSelectedTab2] = useState<RankingType>('topByAvg');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [webSliderIndex, setWebSliderIndex] = useState(0);

  // 스크롤뷰 ref
  const scrollViewRef = useRef<ScrollView>(null);

  // 탭 변경 시 아코디언 모두 닫기
  useEffect(() => {
    console.log('🔥 API_BASE_URL =', Constants.expoConfig?.extra?.apiBaseUrl);
    setExpandedItems(new Set());
  }, [selectedTab2]);

  // 화면이 포커스될 때마다 스크롤 최상단으로
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // 아코디언 토글
  const toggleAccordion = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  // 최근 1년 기간 설정
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const startDate = formatDate(oneYearAgo);
  const endDate = formatDate(today);

  const { data: brokerRanking } = useBrokerRanking(startDate, endDate);
  const { data: allBrokers } = useAllBrokers();

  // 아코디언용 현재 선택된 탭의 데이터
  const currentAccordionData = useMemo(() => {
    if (!brokerRanking) return [];
    return brokerRanking[selectedTab2] || [];
  }, [brokerRanking, selectedTab2]);

  // status에 따른 날짜 가져오기
  const getDateByStatus = (item: any): string | null => {
    switch (item.status) {
      case '청약':
        // subscriptiondate가 범위 형식("2025.11.17~2025.11.18")일 경우 첫 번째 날짜 사용
        const subDate = item.subscriptiondate || item.date;
        return subDate ? subDate.split('~')[0].trim() : null;
      case '상장':
        return item.listingdate || null;
      case '환불':
        return item.refunddate || null;
      default:
        return item.date || null;
    }
  };

  // 공모가 가져오기 (confirmedprice가 있으면 사용, 없으면 desiredprice)
  const getPrice = (item: any): string => {
    if (item.confirmedprice && item.confirmedprice !== '-원') {
      return item.confirmedprice;
    }
    return item.desiredprice || '-';
  };

  // 슬라이더 아이템 타입
  type SliderItemType = {
    seq: string;
    status: string;
    title: string;
    brokers: string[];
    subscriptiondate?: string;
    listingdate?: string;
    refunddate?: string;
    date: string;
    confirmedprice?: string;
    desiredprice?: string;
    code_id: string;
  };

  const sliderItem = ({ item }: { item: SliderItemType }) => {
    const targetDate = getDateByStatus(item);
    const price = getPrice(item);

    const handlePress = () => {
      if (item.code_id) {
        router.push(`/ipo/${item.code_id}`);
      }
    };

    return (
      <TouchableOpacity
        className="bg-white dark:bg-gray-800 p-4 mx-2 rounded-xl justify-between border border-gray-200 dark:border-gray-700 shadow-sm"
        style={{ width: ITEM_WIDTH, height: 180 }}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* 상단: status와 디데이 */}
        <View className="mb-2">
          <IpoStatusBadge
            dateString={targetDate}
            status={item.status as '청약' | '상장' | '환불'}
          />
        </View>

        {/* 타이틀 */}
        <View className="self-start mb-2">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {item.title}
          </Text>
        </View>

        {/* 공모가 */}
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            공모가
          </Text>
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {price}
          </Text>
        </View>

        {/* 은행 */}
        <View className="flex-row flex-wrap gap-2">
          {item.brokers.map((bankName, index) => (
            <View
              key={index}
              className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
            >
              <Text className="text-xs text-gray-600 dark:text-gray-300">
                {bankName}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  // 웹용 슬라이더 네비게이션
  const handleWebSliderPrev = () => {
    setWebSliderIndex((prev) => Math.max(0, prev - 1));
  };

  const handleWebSliderNext = () => {
    if (todayIpo) {
      setWebSliderIndex((prev) => Math.min(todayIpo.length - 1, prev + 1));
    }
  };

  const handleShowAll = () => {
    if (Platform.OS === 'web') {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.itl.aippopick');
    } else {
      router.push('/calendar');
    }
  };

  // 수익률 포맷팅 (소수점 2자리, % 표시)
  const formatRate = (rate: number): string => {
    return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
  };

  // 핵심 지표 가져오기 (탭에 따라)
  const getKeyMetric = (
    item: {
      count: number;
      avg_return_rate: number;
      max_return_rate: number;
    },
    tab: RankingType
  ): { label: string; value: string } => {
    switch (tab) {
      case 'topByCount':
        return { label: '상장 건수', value: `${item.count}건` };
      case 'topByAvg':
        return {
          label: '평균 수익률',
          value: formatRate(item.avg_return_rate),
        };
      case 'topByMax':
        return {
          label: '최대 수익률',
          value: formatRate(item.max_return_rate),
        };
    }
  };

  // 아코디언 아이템 렌더링
  const renderAccordionItem = (item: {
    rank: number;
    broker: string;
    count: number;
    avg_return_rate: number;
    max_return_rate: number;
    min_return_rate: number;
    minus_count: number;
  }) => {
    const key = `${selectedTab2}-${item.rank}-${item.broker}`;
    const isExpanded = expandedItems.has(key);
    const keyMetric = getKeyMetric(item, selectedTab2);

    return (
      <View key={key} className="border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          className="flex-row items-center justify-between px-4 py-3.5 min-h-[56px] border-b border-gray-100 dark:border-gray-700"
          onPress={() => toggleAccordion(key)}
          activeOpacity={0.7}
        >
          <View className="flex-1 flex-row items-center gap-3">
            <View className="w-10 items-start justify-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {item.rank}위
              </Text>
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-[15px] font-semibold text-gray-900 dark:text-white">
                {item.broker}
              </Text>
            </View>
            <View className="items-end justify-center min-w-[100px]">
              <Text className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                {keyMetric.label}
              </Text>
              <Text
                className={cn(
                  'text-base font-semibold',
                  keyMetric.value.includes('%') &&
                    parseFloat(keyMetric.value.replace(/[+%]/g, '')) >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : keyMetric.value.includes('%')
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                )}
              >
                {keyMetric.value}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 pl-3">
            <IconSymbol
              name={isExpanded ? 'chevron.up' : 'chevron.down'}
              size={18}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View className="px-4 pt-3 pb-4 bg-gray-50 dark:bg-gray-900">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                상장 건수
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold">
                {item.count}건
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                평균 수익률
              </Text>
              <Text
                className={cn(
                  'text-sm font-semibold',
                  item.avg_return_rate >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {formatRate(item.avg_return_rate)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                최대 수익률
              </Text>
              <Text
                className={cn(
                  'text-sm font-semibold',
                  item.max_return_rate >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {formatRate(item.max_return_rate)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                최소 수익률
              </Text>
              <Text
                className={cn(
                  'text-sm font-semibold',
                  item.min_return_rate >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {formatRate(item.min_return_rate)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                손실 건수
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white font-semibold">
                {item.minus_count}건
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                앱 바로가기
              </Text>
              <DeepLinkButton
                brokerName={item.broker}
                buttonText="바로가기"
                className="px-3 py-1.5"
                textClassName="text-[13px]"
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const isLoading = !todayIpo || !brokerRanking || !allBrokers;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#666" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ gap: 12 }}
      >
        {/* 슬라이더 */}
        <View className="py-5 justify-center">
          <SectionHeader title="오늘의 공모주" onPress={handleShowAll} showPlayStoreOnWeb />
{isWeb ? (
            // 웹: 버튼으로 좌우 이동 + 도트 인디케이터
            <View className="px-4">
              <View className="flex-row items-center justify-center">
                <TouchableOpacity
                  onPress={handleWebSliderPrev}
                  disabled={webSliderIndex === 0}
                  className="p-3"
                  style={{ opacity: webSliderIndex === 0 ? 0.3 : 1 }}
                >
                  <IconSymbol name="chevron.left" size={24} color={iconColor} />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                  {todayIpo && todayIpo[webSliderIndex] && sliderItem({ item: todayIpo[webSliderIndex] })}
                </View>

                <TouchableOpacity
                  onPress={handleWebSliderNext}
                  disabled={!todayIpo || webSliderIndex >= todayIpo.length - 1}
                  className="p-3"
                  style={{ opacity: !todayIpo || webSliderIndex >= todayIpo.length - 1 ? 0.3 : 1 }}
                >
                  <IconSymbol name="chevron.right" size={24} color={iconColor} />
                </TouchableOpacity>
              </View>

              {/* 도트 인디케이터 */}
              {todayIpo && todayIpo.length > 1 && (
                <View className="flex-row justify-center items-center gap-2 mt-4">
                  {todayIpo.map((_: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setWebSliderIndex(index)}
                    >
                      <View
                        className={cn(
                          'rounded-full',
                          index === webSliderIndex
                            ? 'bg-gray-800 dark:bg-white'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                        style={{
                          width: index === webSliderIndex ? 8 : 6,
                          height: index === webSliderIndex ? 8 : 6,
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            // 앱: 기존 FlatList 슬라이더
            <FlatList
              data={todayIpo}
              renderItem={sliderItem}
              keyExtractor={(item) => item.seq}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: PADDING }}
              snapToAlignment="start"
              snapToInterval={ITEM_WIDTH + 10}
            />
          )}
        </View>

        {/* 증권사별 수익률 (아코디언) */}
        <View className="pb-6">
          <SectionHeader title="증권사별 순위" subTitle="최근 1년" />

          {/* 탭 */}
          <View className="flex-row px-4 gap-3 mb-4">
            <TouchableOpacity
              className={cn(
                'flex-1 py-3 px-3 rounded-xl items-center justify-center border shadow-sm',
                selectedTab2 === 'topByAvg'
                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
              onPress={() => setSelectedTab2('topByAvg')}
            >
              <Text
                className={cn(
                  'text-[13px] font-medium',
                  selectedTab2 === 'topByAvg'
                    ? 'text-white dark:text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                평균 수익률
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={cn(
                'flex-1 py-3 px-3 rounded-xl items-center justify-center border shadow-sm',
                selectedTab2 === 'topByMax'
                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
              onPress={() => setSelectedTab2('topByMax')}
            >
              <Text
                className={cn(
                  'text-[13px] font-medium',
                  selectedTab2 === 'topByMax'
                    ? 'text-white dark:text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                최대 수익률
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={cn(
                'flex-1 py-3 px-3 rounded-xl items-center justify-center border shadow-sm',
                selectedTab2 === 'topByCount'
                  ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
              onPress={() => setSelectedTab2('topByCount')}
            >
              <Text
                className={cn(
                  'text-[13px] font-medium',
                  selectedTab2 === 'topByCount'
                    ? 'text-white dark:text-gray-900 font-semibold'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                상장 건수
              </Text>
            </TouchableOpacity>
          </View>

          {/* 아코디언 리스트 */}
          <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {currentAccordionData.map(
              (item: {
                rank: number;
                broker: string;
                count: number;
                avg_return_rate: number;
                max_return_rate: number;
                min_return_rate: number;
                minus_count: number;
              }) => renderAccordionItem(item)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
