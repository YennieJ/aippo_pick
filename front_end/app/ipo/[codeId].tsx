import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIpoByCodeId } from '../../src/features/ipo/hooks/useIpoQueries';
import { IpoDetailData } from '../../src/features/ipo/types/ipo.types';
import { DeepLinkButton, IconSymbol } from '../../src/shared';

import { useEffect, useState } from 'react'; // React 훅
import {
  loadFavorites,
  toggleFavorite,
} from '../../src/features/storage/favoriteStorage'; // 즐겨찾기 관련 함수
import { addRecentIpo } from '../../src/features/storage/recentStorage'; // 최근 본 공모주 추가 함수

export default function IpoDetailScreen() {
  const { codeId } = useLocalSearchParams<{ codeId: string }>();
  const { data, isLoading, error } = useIpoByCodeId(codeId || '');
  const codeIdStr = Array.isArray(codeId) ? codeId[0] : codeId ?? '';

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

    addRecentIpo(codeIdStr);
  }, [codeIdStr, data]);

  // ✅ 2) 즐겨찾기 상태 로드
  useEffect(() => {
    if (!favoriteKey) return;

    loadFavorites().then((list) => {
      setFavorites(list);
      setIsFavorite(list.includes(favoriteKey));
    });
  }, [favoriteKey]);

  const onToggleFavorite = async () => {
    if (!favoriteKey) return;

    const next = await toggleFavorite(favoriteKey);
    setFavorites(next);
    setIsFavorite(next.includes(favoriteKey));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            데이터를 불러오는 중 오류가 발생했습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ipoData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>데이터 없음</Text>
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

  // 날짜가 지났는지 확인
  const isDatePassed = (dateString: string): boolean => {
    if (!dateString) return false;
    const normalizedDate = dateString.split('~')[0].trim().replace(/\./g, '-');
    const targetDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() < today.getTime();
  };

  // 증권사 파싱 (쉼표로 구분)
  const underwriters = ipoData.underwriter
    ? ipoData.underwriter.split(',').map((u) => u.trim())
    : [];

  // 산업 분류 추출 (industry에서)
  const industry = ipoData.industry || '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 상단 태그 영역 */}
        <View style={styles.headerSection}>
          <View style={styles.tagRow}>
            <View style={styles.companyTag}>
              <Text style={styles.companyTagText}>{ipoData.company}</Text>
            </View>
          </View>
          {statusInfo && (
            <View
              style={[styles.statusBadge, { borderColor: statusInfo.color }]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.status} {ddayText}
              </Text>
            </View>
          )}
        </View>
        {/* 회사 소개 */}
        {industry && (
          <View style={styles.card}>
            {/* 회사 소개 제목 + 즐겨찾기 */}
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>회사 소개</Text>
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.favoriteButton}
              >
                <Text style={styles.favoriteIcon}>
                  {isFavorite ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 회사 설명 */}
            <Text style={styles.cardValue}>{industry}</Text>
          </View>
        )}
        {/* 청약 가능한 증권사 */}
        {underwriters.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>청약 가능한 증권사</Text>
            {underwriters.map((broker, index) => (
              <View key={index} style={styles.brokerRow}>
                <View style={styles.brokerInfo}>
                  <Text style={styles.brokerName}>{broker}</Text>
                  <Text style={styles.brokerFee}>수수료: 1,500원</Text>
                </View>
                <DeepLinkButton
                  brokerName={broker}
                  style={styles.goButton}
                  textStyle={styles.goButtonText}
                />
              </View>
            ))}
          </View>
        )}

        {/* 주요 정보 카드 (2열) */}
        <View style={styles.mainInfoCard}>
          {/* 왼쪽: 현재가/확정 공모가/희망 공모가 */}
          <View style={styles.priceColumn}>
            <Text style={styles.priceLabelText}>{priceLabel}</Text>
            {currentPrice ? (
              <Text style={styles.priceValue}>{currentPrice}</Text>
            ) : (
              <Text style={styles.priceValue}>-</Text>
            )}
            {showRealTimeUpdate && (
              <Text style={styles.updateText}>실시간 업데이트 중</Text>
            )}
          </View>

          {/* 오른쪽: 청약 경쟁률/기관 경쟁률 */}
          <View style={styles.competitionColumn}>
            <Text style={styles.competitionLabelText}>{competitionLabel}</Text>
            {competitionRate ? (
              <Text style={styles.competitionValue}>{competitionRate}</Text>
            ) : (
              <Text style={styles.competitionValue}>-</Text>
            )}
          </View>
        </View>

        {/* 일정 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>일정</Text>
          <View style={styles.scheduleList}>
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleIconWrapper}>
                <View style={styles.scheduleIconContainer}>
                  {ipoData.forecastdate &&
                  isDatePassed(ipoData.forecastdate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol name="circle" size={24} color="#E5E5E5" />
                  )}
                </View>
                <View style={styles.scheduleLine} />
              </View>
              <View style={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleLabel}>수요예측일</Text>
                  <Text style={styles.scheduleValue}>
                    ({ipoData.forecastdate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleIconWrapper}>
                <View style={styles.scheduleIconContainer}>
                  {ipoData.subscriptiondate &&
                  isDatePassed(ipoData.subscriptiondate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol name="circle" size={24} color="#E5E5E5" />
                  )}
                </View>
                <View style={styles.scheduleLine} />
              </View>
              <View style={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleLabel}>청약일</Text>
                  <Text style={styles.scheduleValue}>
                    ({ipoData.subscriptiondate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleIconWrapper}>
                <View style={styles.scheduleIconContainer}>
                  {ipoData.refunddate && isDatePassed(ipoData.refunddate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol name="circle" size={24} color="#E5E5E5" />
                  )}
                </View>
                <View style={styles.scheduleLine} />
              </View>
              <View style={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleLabel}>환불일</Text>
                  <Text style={styles.scheduleValue}>
                    ({ipoData.refunddate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.scheduleItem, styles.scheduleItemLast]}>
              <View style={styles.scheduleIconWrapper}>
                <View style={styles.scheduleIconContainer}>
                  {ipoData.listingdate && isDatePassed(ipoData.listingdate) ? (
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={24}
                      color="#FF6B35"
                    />
                  ) : (
                    <IconSymbol name="circle" size={24} color="#E5E5E5" />
                  )}
                </View>
              </View>
              <View style={styles.scheduleContent}>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleLabel}>상장일</Text>
                  <Text style={styles.scheduleValue}>
                    ({ipoData.listingdate || '미정'})
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 공모 정보 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>공모 정보</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>시가총액</Text>
              <Text style={styles.tableValue}>
                {ipoData.market_cap && ipoData.market_cap !== ''
                  ? ipoData.market_cap
                  : '없음'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>상장주식수</Text>
              <Text style={styles.tableValue}>
                {ipoData.listed_shares && ipoData.listed_shares !== ''
                  ? ipoData.listed_shares
                  : '없음'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>총공모주식수</Text>
              <Text style={styles.tableValue}>
                {ipoData.totalnumber ? ipoData.totalnumber : '없음'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>기관경쟁률</Text>
              <Text style={styles.tableValue}>
                {ipoData.institutional_competition_rate &&
                ipoData.institutional_competition_rate !== ''
                  ? ipoData.institutional_competition_rate
                  : '없음'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>유통비율</Text>
              <Text style={styles.tableValue}>
                {ipoData.circulation_ratio && ipoData.circulation_ratio !== ''
                  ? ipoData.circulation_ratio
                  : '없음'}
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={styles.tableLabel}>의무보유확약</Text>
              <Text style={styles.tableValue}>
                {ipoData.mandatoryretention &&
                ipoData.mandatoryretention !== '0.00%'
                  ? ipoData.mandatoryretention
                  : '없음'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  companyTag: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  companyTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  industryTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  industryTagText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mainInfoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    paddingRight: 20,
  },
  priceLabelText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 12,
    color: '#999',
  },
  competitionColumn: {
    flex: 1,
  },
  competitionLabelText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  competitionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  scheduleList: {
    position: 'relative',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  scheduleItemLast: {
    paddingBottom: 0,
  },
  scheduleIconWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  scheduleIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    zIndex: 1,
    backgroundColor: '#fff',
  },
  scheduleLine: {
    position: 'absolute',
    top: 26,
    left: 11,
    width: 2,
    height: '100%',
    backgroundColor: '#E5E5E5',
    zIndex: 0,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  scheduleValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  brokerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  brokerInfo: {
    flex: 1,
    marginRight: 12,
  },
  brokerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  brokerFee: {
    fontSize: 13,
    color: '#666',
  },
  goButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  goButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  tableValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
  statsContainer: {
    gap: 16,
  },
  statItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12, // 카드 내용과 간격
  },
  favoriteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  favoriteIcon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B',
  },
});
