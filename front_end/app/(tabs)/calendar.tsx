import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

import {
  CalendarHeader,
  CalendarWeek,
  EventTypeFilter,
} from '../../src/features/calendar';
import {
  EventType,
  EventTypeValue,
} from '../../src/features/calendar/constants/event.constants';
import { useCalendarEvents } from '../../src/features/calendar/hooks/useCalendarEvents';
import {
  generateCalendarWeeks,
  getDayWidth,
} from '../../src/features/calendar/utils/calendar.utils';
import {
  useAllBrokers,
  useIpoCalendar,
} from '../../src/features/ipo/hooks/useIpoQueries';

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 오늘 날짜
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  // 청상환 필터 기본값: 모든 타입 선택
  const [selectedTypes, setSelectedTypes] = useState<Set<EventTypeValue>>(
    new Set(Object.values(EventType))
  );

  // 조회 종목 필터 (UI만, 기능은 나중에)
  const [excludeSpec, setExcludeSpec] = useState(false); // 스펙 제외
  const [excludeReits, setExcludeReits] = useState(false); // 리츠 제외

  // 필터 모달
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]); // broker_name 배열
  const [tempSelectedBrokers, setTempSelectedBrokers] = useState<string[]>([]); // 모달 내 임시 선택
  const [tempExcludeSpec, setTempExcludeSpec] = useState(false); // 모달 내 임시 스펙 제외
  const [tempExcludeReits, setTempExcludeReits] = useState(false); // 모달 내 임시 리츠 제외

  // 스크롤뷰 ref
  const scrollViewRef = useRef<ScrollView>(null);

  // 필터 저장/복원
  const FILTER_STORAGE_KEY_BROKERS = '@calendar_filter_brokers';
  const FILTER_STORAGE_KEY_TYPES = '@calendar_filter_types';
  const FILTER_STORAGE_KEY_STOCK = '@calendar_filter_stock';

  // 앱 시작 시 저장된 필터 불러오기
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // 저장된 필터 불러오기
  const loadSavedFilters = async () => {
    try {
      // 증권사 필터
      const savedBrokers = await AsyncStorage.getItem(
        FILTER_STORAGE_KEY_BROKERS
      );
      if (savedBrokers) {
        setSelectedBrokers(JSON.parse(savedBrokers));
      }

      // 청상환 필터
      const savedTypes = await AsyncStorage.getItem(FILTER_STORAGE_KEY_TYPES);
      if (savedTypes) {
        const typesArray = JSON.parse(savedTypes);
        setSelectedTypes(new Set(typesArray));
      } else {
        // 저장된 필터가 없으면 기본값: 모든 타입 선택
        setSelectedTypes(new Set(Object.values(EventType)));
      }

      // 조회 종목 필터
      const savedStock = await AsyncStorage.getItem(FILTER_STORAGE_KEY_STOCK);
      if (savedStock) {
        const stockFilter = JSON.parse(savedStock);
        setExcludeSpec(stockFilter.excludeSpec || false);
        setExcludeReits(stockFilter.excludeReits || false);
      }
    } catch (error) {
      console.error('필터 불러오기 실패:', error);
    }
  };

  // 증권사 필터 저장하기
  const saveBrokerFilters = async (brokers: string[]) => {
    try {
      if (brokers.length === 0) {
        await AsyncStorage.removeItem(FILTER_STORAGE_KEY_BROKERS);
      } else {
        await AsyncStorage.setItem(
          FILTER_STORAGE_KEY_BROKERS,
          JSON.stringify(brokers)
        );
      }
    } catch (error) {
      console.error('증권사 필터 저장 실패:', error);
    }
  };

  // 청상환 필터 저장하기
  const saveTypeFilters = async (types: Set<EventTypeValue>) => {
    try {
      if (types.size === 0) {
        await AsyncStorage.removeItem(FILTER_STORAGE_KEY_TYPES);
      } else {
        await AsyncStorage.setItem(
          FILTER_STORAGE_KEY_TYPES,
          JSON.stringify(Array.from(types))
        );
      }
    } catch (error) {
      console.error('청상환 필터 저장 실패:', error);
    }
  };

  // 조회 종목 필터 저장하기
  const saveStockFilters = async (
    excludeSpec: boolean,
    excludeReits: boolean
  ) => {
    try {
      if (!excludeSpec && !excludeReits) {
        await AsyncStorage.removeItem(FILTER_STORAGE_KEY_STOCK);
      } else {
        await AsyncStorage.setItem(
          FILTER_STORAGE_KEY_STOCK,
          JSON.stringify({ excludeSpec, excludeReits })
        );
      }
    } catch (error) {
      console.error('조회 종목 필터 저장 실패:', error);
    }
  };

  // 모달 열릴 때 현재 선택을 임시 상태로 복사
  useEffect(() => {
    if (isFilterModalVisible) {
      setTempSelectedBrokers([...selectedBrokers]);
      setTempExcludeSpec(excludeSpec);
      setTempExcludeReits(excludeReits);
    }
  }, [isFilterModalVisible]);

  // 화면이 포커스될 때마다 이번 달로 리셋하고 스크롤 최상단으로
  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth() + 1);
      // 스크롤을 최상단으로 이동
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // 현재 선택된 달의 시작일과 종료일 계산
  const currentStartDate = `${currentYear}.${String(currentMonth).padStart(
    2,
    '0'
  )}.01`;
  const currentLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const currentEndDate = `${currentYear}.${String(currentMonth).padStart(
    2,
    '0'
  )}.${String(currentLastDay).padStart(2, '0')}`;

  const {
    data: ipoData = [],
    isLoading,
    error,
  } = useIpoCalendar(currentStartDate, currentEndDate);

  // 필터용 전체 공모주 목록
  const { data: allBrokers = [] } = useAllBrokers();

  // 브로커 필터 핸들러 (모달 내 임시 상태 변경)
  const toggleBroker = (brokerName: string) => {
    if (tempSelectedBrokers.includes(brokerName)) {
      setTempSelectedBrokers(
        tempSelectedBrokers.filter((name) => name !== brokerName)
      );
    } else {
      setTempSelectedBrokers([...tempSelectedBrokers, brokerName]);
    }
  };

  // 전체 선택 = 초기화 (임시 상태만 변경)
  const resetToAll = () => {
    setTempSelectedBrokers([]);
  };

  // 적용 버튼 클릭 시 실제 상태에 반영하고 저장
  const applyFilters = async () => {
    setSelectedBrokers([...tempSelectedBrokers]);
    setExcludeSpec(tempExcludeSpec);
    setExcludeReits(tempExcludeReits);

    // 필터 저장
    await saveBrokerFilters(tempSelectedBrokers);
    await saveStockFilters(tempExcludeSpec, tempExcludeReits);

    setIsFilterModalVisible(false);
  };

  // 타입 토글 핸들러
  const toggleType = async (type: EventTypeValue) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
    // 청상환 필터 저장
    await saveTypeFilters(newSet);
  };

  const weeks = generateCalendarWeeks(currentYear, currentMonth);
  const weekDays = ['월', '화', '수', '목', '금'];

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Text className="py-4 px-4 text-xl font-bold text-[#1A1A1A] dark:text-white">
          월별 달력
        </Text>

        {/* 필터 버튼들 */}
        <View className="flex-row px-4 items-center justify-between gap-3 mb-2">
          <EventTypeFilter
            selectedTypes={selectedTypes}
            onToggle={toggleType}
          />
          <TouchableOpacity
            onPress={() => setIsFilterModalVisible(true)}
            className="p-2 min-w-[36px] min-h-[36px] items-center justify-center"
          >
            <Feather
              name="filter"
              size={20}
              color={
                selectedBrokers.length > 0 || excludeSpec || excludeReits
                  ? '#4A90E2'
                  : isDark
                    ? '#fff'
                    : '#000'
              }
            />
          </TouchableOpacity>
        </View>

        <CalendarHeader
          year={currentYear}
          month={currentMonth}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />

        {/* 요일 헤더 */}
        <View className="flex-row px-4">
          {weekDays.map((day, index) => (
            <View
              key={index}
              className="p-2.5 items-center justify-center"
              style={{ width: `${getDayWidth(index)}%` }}
            >
              <Text className="text-xs font-semibold text-[#666] dark:text-gray-400">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* 주별로 렌더링 */}
        {weeks.map((week, weekIndex) => {
          // 필터링: 증권사 -> 스펙 제외 -> 리츠 제외
          let filteredIpoData = ipoData;

          // 증권사 필터링
          if (selectedBrokers.length > 0) {
            filteredIpoData = filteredIpoData.filter((ipo: any) => {
              if (!ipo.underwriter) return false;
              const underwriters = ipo.underwriter
                .split(',')
                .map((u: string) => u.trim());
              return selectedBrokers.some((broker) =>
                underwriters.includes(broker)
              );
            });
          }

          // 스펙 제외 필터링
          if (excludeSpec) {
            filteredIpoData = filteredIpoData.filter(
              (ipo: any) => !ipo.company?.includes('스팩')
            );
          }

          // 리츠 제외 필터링
          if (excludeReits) {
            filteredIpoData = filteredIpoData.filter(
              (ipo: any) => !ipo.company?.includes('리츠')
            );
          }

          const events = useCalendarEvents(
            week,
            currentYear,
            currentMonth,
            filteredIpoData,
            selectedTypes
          );
          return (
            <CalendarWeek
              key={weekIndex}
              week={week}
              events={events}
              todayYear={todayYear}
              todayMonth={todayMonth}
              todayDay={todayDay}
              currentYear={currentYear}
              currentMonth={currentMonth}
            />
          );
        })}
      </ScrollView>

      {/* 필터 바텀시트 모달 */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          />
          <View className="bg-white dark:bg-gray-800 rounded-t-[20px] max-h-[85%] min-h-[500px] flex-col">
            <View className="flex-row justify-between items-center p-5">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                캘린더 필터
              </Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Text className="text-2xl text-[#666] dark:text-gray-400">
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 min-h-0"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* 조회 종목 필터 */}
              <View className="px-5 py-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
                <Text className="text-base font-semibold text-[#333] dark:text-white mb-3">
                  조회 종목
                </Text>
                <View className="flex-row gap-4">
                  <TouchableOpacity
                    className="flex-row items-center gap-2"
                    onPress={() => setTempExcludeSpec(!tempExcludeSpec)}
                  >
                    <View
                      className={`w-5 h-5 border-2 rounded items-center justify-center ${
                        tempExcludeSpec
                          ? 'bg-[#4A90E2] border-[#4A90E2]'
                          : 'border-[#ddd] dark:border-gray-600'
                      }`}
                    >
                      {tempExcludeSpec && (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      )}
                    </View>
                    <Text className="text-sm text-[#333] dark:text-white font-medium">
                      스펙 제외
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center gap-2"
                    onPress={() => setTempExcludeReits(!tempExcludeReits)}
                  >
                    <View
                      className={`w-5 h-5 border-2 rounded items-center justify-center ${
                        tempExcludeReits
                          ? 'bg-[#4A90E2] border-[#4A90E2]'
                          : 'border-[#ddd] dark:border-gray-600'
                      }`}
                    >
                      {tempExcludeReits && (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      )}
                    </View>
                    <Text className="text-sm text-[#333] dark:text-white font-medium">
                      리츠 제외
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 증권사 필터 */}
              <View className="px-5 py-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-semibold text-[#333] dark:text-white">
                    증권사
                  </Text>
                  <TouchableOpacity
                    className={`px-3 py-1.5 rounded ${
                      tempSelectedBrokers.length === 0
                        ? 'bg-[#f0f0f0] dark:bg-gray-700 opacity-50'
                        : 'bg-[#f5f5f5] dark:bg-gray-700'
                    }`}
                    onPress={resetToAll}
                    disabled={tempSelectedBrokers.length === 0}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        tempSelectedBrokers.length === 0
                          ? 'text-[#999] dark:text-gray-500'
                          : 'text-[#333] dark:text-white'
                      }`}
                    >
                      전체
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="gap-0">
                  {allBrokers.map((broker: any) => {
                    const isSelected = tempSelectedBrokers.includes(
                      broker.broker_name
                    );
                    return (
                      <TouchableOpacity
                        key={broker.broker_id}
                        className="flex-row justify-between items-center px-5 py-3"
                        onPress={() => toggleBroker(broker.broker_name)}
                      >
                        <View className="flex-row items-center gap-3">
                          <Text className="text-base font-medium text-gray-900 dark:text-white">
                            {broker.broker_name}
                          </Text>
                        </View>
                        <View
                          className={`w-6 h-6 border-2 rounded items-center justify-center ${
                            isSelected
                              ? 'bg-[#4A90E2] border-[#4A90E2]'
                              : 'border-[#ddd] dark:border-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <Text className="text-white text-base font-bold">
                              ✓
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              className="mx-5 mt-4 py-3.5 bg-[#4A90E2] rounded-lg items-center"
              onPress={applyFilters}
            >
              <Text className="text-white text-base font-bold">적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
