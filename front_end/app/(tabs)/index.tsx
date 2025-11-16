import React, { useEffect, useMemo, useState } from 'react';

import { IconSymbol } from '../../src/shared/components/ui/icon-symbol';
import { useBrokerRanking, useTodayIpo } from '../../src/features/ipo/hooks/useIpoQueries';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window'); // Get screen width
const ITEM_WIDTH = width * 0.8; // 화면의 90%
const PADDING = 14; // 양옆 패딩

type RankingType = 'topByCount' | 'topByAvg' | 'topByMax';

export default function HomeScreen() {
  const { data: todayIpo } = useTodayIpo();
  const router = useRouter();
  const [selectedTab2, setSelectedTab2] = useState<RankingType>('topByAvg');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 탭 변경 시 아코디언 모두 닫기
  useEffect(() => {
    setExpandedItems(new Set());
  }, [selectedTab2]);

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

  // 올해 1월 1일 ~ 12월 31일
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}.01.01`;
  const endDate = `${currentYear}.12.31`;
  const { data: brokerRanking } = useBrokerRanking(startDate, endDate);

  // 아코디언용 현재 선택된 탭의 데이터
  const currentAccordionData = useMemo(() => {
    if (!brokerRanking) return [];
    return brokerRanking[selectedTab2] || [];
  }, [brokerRanking, selectedTab2]);

  // 디데이 계산 함수
  const calculateDday = (dateString: string): number => {
    // 날짜 형식: "2025.11.27" 또는 "2025-11-27"
    const normalizedDate = dateString.replace(/\./g, '-');
    const targetDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // status에 따른 날짜 가져오기
  const getDateByStatus = (item: any): string => {
    switch (item.status) {
      case '청약':
        // subscriptiondate가 범위 형식("2025.11.17~2025.11.18")일 경우 첫 번째 날짜 사용
        const subDate = item.subscriptiondate || item.date;
        return subDate.split('~')[0].trim();
      case '상장':
        return item.listingdate;
      case '환불':
        return item.refunddate;
      default:
        return item.date;
    }
  };

  // 공모가 가져오기 (confirmedprice가 있으면 사용, 없으면 desiredprice)
  const getPrice = (item: any): string => {
    if (item.confirmedprice && item.confirmedprice !== '-원') {
      return item.confirmedprice;
    }
    return item.desiredprice || '-';
  };

  // status에 따른 색상 가져오기 (필터 뱃지와 동일한 색상)
  const getStatusColor = (status: string): string => {
    switch (status) {
      case '청약':
        return '#5B9FFF'; // 부드러운 파랑
      case '환불':
        return '#34D399'; // 부드러운 초록
      case '상장':
        return '#F87171'; // 부드러운 빨강
      default:
        return '#666666';
    }
  };

  const sliderItem = ({
    item,
  }: {
    item: {
      id: string;
      status: string;
      title: string;
      bank: string[];
      subscriptiondate?: string;
      listingdate?: string;
      refunddate?: string;
      date: string;
      confirmedprice?: string;
      desiredprice?: string;
    };
  }) => {
    const targetDate = getDateByStatus(item);
    const dday = calculateDday(targetDate);
    const ddayText =
      dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${Math.abs(dday)}`;
    const price = getPrice(item);
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.slideItemContainer}>
        {/* 상단: status와 디데이 */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.ddayText}>{ddayText}</Text>
        </View>

        {/* 타이틀 */}
        <View style={styles.titleSection}>
          <Text style={styles.slideItemTitle}>{item.title}</Text>
        </View>

        {/* 공모가 */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>공모가</Text>
          <Text style={styles.priceValue}>{price}</Text>
        </View>

        {/* 은행 */}
        <View style={styles.bankSection}>
          {item.bank.map((bankName, index) => (
            <View key={index} style={styles.bankTag}>
              <Text style={styles.bankText}>{bankName}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = (title: string, onPress?: () => void) => {
    return (
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>{title}</Text>
        {onPress && (
          <TouchableOpacity style={styles.headerButton} onPress={onPress}>
            <Text style={styles.headerButtonText}>전체보기</Text>
            <IconSymbol size={16} name="chevron.right" color="black" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleShowAll = () => {
    router.push('/(tabs)/calendar');
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
      <View key={key} style={styles.accordionItem}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => toggleAccordion(key)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderContent}>
            <View style={styles.accordionRankCell}>
              <Text style={styles.accordionRankText}>{item.rank}위</Text>
            </View>
            <View style={styles.accordionBrokerCell}>
              <Text style={styles.accordionBrokerText}>{item.broker}</Text>
            </View>
            <View style={styles.accordionMetricCell}>
              <Text style={styles.accordionMetricLabel}>{keyMetric.label}</Text>
              <Text
                style={[
                  styles.accordionMetricValue,
                  keyMetric.value.includes('%') &&
                  parseFloat(keyMetric.value.replace(/[+%]/g, '')) >= 0
                    ? styles.positiveRate
                    : keyMetric.value.includes('%')
                    ? styles.negativeRate
                    : {},
                ]}
              >
                {keyMetric.value}
              </Text>
            </View>
          </View>
          <View style={styles.accordionToggle}>
            <IconSymbol
              name={isExpanded ? 'chevron.up' : 'chevron.down'}
              size={18}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.accordionContent}>
            <View style={styles.accordionDetailRow}>
              <Text style={styles.accordionDetailLabel}>상장 건수</Text>
              <Text style={styles.accordionDetailValue}>{item.count}건</Text>
            </View>
            <View style={styles.accordionDetailRow}>
              <Text style={styles.accordionDetailLabel}>평균 수익률</Text>
              <Text
                style={[
                  styles.accordionDetailValue,
                  item.avg_return_rate >= 0
                    ? styles.positiveRate
                    : styles.negativeRate,
                ]}
              >
                {formatRate(item.avg_return_rate)}
              </Text>
            </View>
            <View style={styles.accordionDetailRow}>
              <Text style={styles.accordionDetailLabel}>최대 수익률</Text>
              <Text
                style={[
                  styles.accordionDetailValue,
                  item.max_return_rate >= 0
                    ? styles.positiveRate
                    : styles.negativeRate,
                ]}
              >
                {formatRate(item.max_return_rate)}
              </Text>
            </View>
            <View style={styles.accordionDetailRow}>
              <Text style={styles.accordionDetailLabel}>최소 수익률</Text>
              <Text
                style={[
                  styles.accordionDetailValue,
                  item.min_return_rate >= 0
                    ? styles.positiveRate
                    : styles.negativeRate,
                ]}
              >
                {formatRate(item.min_return_rate)}
              </Text>
            </View>
            <View style={styles.accordionDetailRow}>
              <Text style={styles.accordionDetailLabel}>손실 건수</Text>
              <Text style={styles.accordionDetailValue}>
                {item.minus_count}건
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    // SafeAreaView가 설정한 헤더를 덮지 않음
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }}>
        {/* 슬라이더 */}
        <View style={styles.sliderContainer}>
          <View style={styles.headerContainer}>
            {renderHeader('오늘의 공모주', handleShowAll)}
          </View>
          <FlatList
            data={todayIpo}
            renderItem={sliderItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PADDING }}
            snapToAlignment="start"
            snapToInterval={ITEM_WIDTH + 10}
          />
        </View>

        {/* 증권사별 수익률 (아코디언) */}
        <View style={styles.rankingSection}>
          <View style={styles.headerContainer}>
            {renderHeader('증권사별 수익률 순위')}
          </View>

          {/* 탭 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab2 === 'topByAvg' && styles.activeTab,
              ]}
              onPress={() => setSelectedTab2('topByAvg')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab2 === 'topByAvg' && styles.activeTabText,
                ]}
              >
                평균 수익률
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab2 === 'topByMax' && styles.activeTab,
              ]}
              onPress={() => setSelectedTab2('topByMax')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab2 === 'topByMax' && styles.activeTabText,
                ]}
              >
                최대 수익률
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab2 === 'topByCount' && styles.activeTab,
              ]}
              onPress={() => setSelectedTab2('topByCount')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab2 === 'topByCount' && styles.activeTabText,
                ]}
              >
                상장 건수
              </Text>
            </TouchableOpacity>
          </View>

          {/* 아코디언 리스트 */}
          <View style={styles.accordionContainer}>
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

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
  },
  slideItemContainer: {
    width: ITEM_WIDTH,
    height: 180,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ddayText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleSection: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  slideItemTitle: {
    color: '#1A1A1A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceLabel: {
    color: '#666',
    fontSize: 14,
  },
  priceValue: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  bankSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bankText: {
    color: '#666',
    fontSize: 12,
  },
  rankingSection: {
    paddingBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  positiveRate: {
    color: '#DC2626',
  },
  negativeRate: {
    color: '#2563EB',
  },
  accordionContainer: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accordionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accordionRankCell: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  accordionRankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accordionBrokerCell: {
    flex: 1,
    justifyContent: 'center',
  },
  accordionBrokerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accordionMetricCell: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 100,
  },
  accordionMetricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  accordionMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
  },
  accordionToggleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  accordionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accordionDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  accordionDetailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
});
