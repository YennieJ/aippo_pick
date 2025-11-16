import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CalendarHeader,
  CalendarWeek,
  EventTypeFilter,
} from '../../src/features/calendar';
import { useCalendarEvents } from '../../src/features/calendar/hooks/useCalendarEvents';
import { useAllBrokers, useIpoCalendar } from '../../src/features/ipo/hooks/useIpoQueries';
import { EventType, EventTypeValue } from '../../src/features/calendar/constants/event.constants';
import { generateCalendarWeeks, getDayWidth } from '../../src/features/calendar/utils/calendar.utils';

export default function CalendarScreen() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.headerTitle}>월별 달력</Text>

        {/* 필터 버튼들 */}
        <View style={styles.filterContainer}>
          <EventTypeFilter
            selectedTypes={selectedTypes}
            onToggle={toggleType}
          />
          <TouchableOpacity
            onPress={() => setIsFilterModalVisible(true)}
            style={styles.brokerFilterButton}
          >
            <Feather
              name="filter"
              size={20}
              color={
                selectedBrokers.length > 0 || excludeSpec || excludeReits
                  ? '#4A90E2'
                  : 'black'
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
        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => (
            <View
              key={index}
              style={[styles.weekDayCell, { width: `${getDayWidth(index)}%` }]}
            >
              <Text style={styles.weekDayText}>{day}</Text>
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>캘린더 필터</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* 조회 종목 필터 */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { marginBottom: 12 }]}>
                  조회 종목
                </Text>
                <View style={styles.stockTypeFilterOptions}>
                  <TouchableOpacity
                    style={styles.stockTypeFilterItem}
                    onPress={() => setTempExcludeSpec(!tempExcludeSpec)}
                  >
                    <View
                      style={[
                        styles.stockTypeCheckbox,
                        tempExcludeSpec && styles.stockTypeCheckboxChecked,
                      ]}
                    >
                      {tempExcludeSpec && (
                        <Text style={styles.stockTypeCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.stockTypeFilterText}>스펙 제외</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stockTypeFilterItem}
                    onPress={() => setTempExcludeReits(!tempExcludeReits)}
                  >
                    <View
                      style={[
                        styles.stockTypeCheckbox,
                        tempExcludeReits && styles.stockTypeCheckboxChecked,
                      ]}
                    >
                      {tempExcludeReits && (
                        <Text style={styles.stockTypeCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.stockTypeFilterText}>리츠 제외</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 증권사 필터 */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>증권사</Text>
                  <TouchableOpacity
                    style={[
                      styles.resetButton,
                      tempSelectedBrokers.length === 0 &&
                        styles.resetButtonDisabled,
                    ]}
                    onPress={resetToAll}
                    disabled={tempSelectedBrokers.length === 0}
                  >
                    <Text
                      style={[
                        styles.resetButtonText,
                        tempSelectedBrokers.length === 0 &&
                          styles.resetButtonTextDisabled,
                      ]}
                    >
                      전체
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.ipoList}>
                  {allBrokers.map((broker: any) => {
                    const isSelected = tempSelectedBrokers.includes(
                      broker.broker_name
                    );
                    return (
                      <TouchableOpacity
                        key={broker.broker_id}
                        style={styles.ipoItem}
                        onPress={() => toggleBroker(broker.broker_name)}
                      >
                        <View style={styles.ipoItemContent}>
                          <Text style={styles.ipoName}>
                            {broker.broker_name}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxChecked,
                          ]}
                        >
                          {isSelected && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerTitle: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  weekDayCell: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  brokerFilterButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // 모달 스크롤뷰
  modalScrollView: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  // 모달 섹션
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  resetButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  resetButtonTextDisabled: {
    color: '#999',
  },
  // 조회 종목 필터 스타일
  stockTypeFilterOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  stockTypeFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockTypeCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockTypeCheckboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  stockTypeCheckmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stockTypeFilterText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 500,
    flexDirection: 'column',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  ipoList: {
    gap: 0,
  },
  ipoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ipoItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  ipoName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
