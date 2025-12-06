// app/(tabs)/myPage.tsx  같은 위치라고 가정

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  loadFavorites,
  toggleFavorite,
} from '../../src/features/storage/favoriteStorage';
import {
  loadRecent,
  clearRecent,
  removeRecentIpo,
} from '../../src/features/storage/recentStorage';
import { getIpoByCodeId } from '../../src/features/ipo/api/ipo';
import { IpoDetailData } from '../../src/features/ipo/types/ipo.types';
import {
  loadStringArray,
  removeItem,
  saveStringArray,
  STORAGE_KEYS,
} from '../../src/shared/utils/storage.utils';
import { SafeAreaView } from 'react-native-safe-area-context';

// 문자열("24,650", " 8,000원") → 숫자로 안전하게 변환
const parseNumber = (value?: string | null): number | null => {
  if (!value) return null;

  // 숫자, -, . 만 남기고 다 제거
  const cleaned = value.replace(/[^\d.-]/g, '').trim();
  if (!cleaned) return null;

  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

export default function MyPageScreen() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteDetails, setFavoriteDetails] = useState<IpoDetailData[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [recentDetails, setRecentDetails] = useState<IpoDetailData[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // 공통: codeId 배열 → 상세 데이터 로딩
  const fetchIpoDetailsByIds = useCallback(
    async (ids: string[]): Promise<IpoDetailData[]> => {
      if (!ids.length) return [];

      const results = await Promise.all(
        ids.map(async codeId => {
          try {
            const data = await getIpoByCodeId(codeId);
            const detail: IpoDetailData | undefined = Array.isArray(data)
              ? data[0]
              : data;
            return detail ?? null;
          } catch (e) {
            console.log('getIpoByCodeId error', codeId, e);
            return null;
          }
        }),
      );

      const unique: IpoDetailData[] = [];
      const seen = new Set<string>();

      for (const item of results) {
        if (!item) continue;
        if (seen.has(item.code_id)) continue;
        seen.add(item.code_id);
        unique.push(item);
      }

      return unique;
    },
    [],
  );

  const isFavorite = useCallback(
    (ipoId: string) => favorites.includes(ipoId),
    [favorites],
  );

  // 즐겨찾기 상세
  const loadFavoriteDetails = useCallback(
    async (ids: string[]) => {
      if (!ids.length) {
        setFavoriteDetails([]);
        return;
      }

      setFavoriteLoading(true);
      try {
        const details = await fetchIpoDetailsByIds(ids);
        setFavoriteDetails(details);
      } finally {
        setFavoriteLoading(false);
      }
    },
    [fetchIpoDetailsByIds],
  );

  // 최근 본 상세
  const loadRecentDetails = useCallback(
    async (ids: string[]) => {
      if (!ids.length) {
        setRecentDetails([]);
        return;
      }

      setRecentLoading(true);
      try {
        const details = await fetchIpoDetailsByIds(ids);
        setRecentDetails(details);
      } finally {
        setRecentLoading(false);
      }
    },
    [fetchIpoDetailsByIds],
  );

  // 탭 포커스시 즐겨찾기 + 최근 본 동시 로딩
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const [favoriteList, recentList] = await Promise.all([
            loadFavorites(),
            loadRecent(),
          ]);
          if (cancelled) return;

          console.log('⭐ MyPage favorites:', favoriteList);
          console.log('👀 MyPage recent:', recentList);

          setFavorites(favoriteList);

          await Promise.all([
            loadFavoriteDetails(favoriteList),
            loadRecentDetails(recentList),
          ]);
        } catch (e) {
          console.log('MyPage load error', e);
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [loadFavoriteDetails, loadRecentDetails]),
  );

  // 최근 본 전체 삭제
  const onClearRecent = useCallback(async () => {
    try {
      await clearRecent();
      setRecentDetails([]);
    } catch (e) {
      console.log('onClearRecent error', e);
    }
  }, []);

  // 최근 본 한 줄 삭제
  const onRemoveRecent = useCallback(async (ipoId: string) => {
    try {
      await removeRecentIpo(ipoId);
      setRecentDetails(prev => prev.filter(item => item.code_id !== ipoId));
    } catch (e) {
      console.log('onRemoveRecent error', e);
    }
  }, []);

  // 즐겨찾기 토글 (MyPage에서 바로 반영)
  const onToggleFavorite = useCallback(
    async (ipoId: string) => {
      const existsNow = favorites.includes(ipoId);
      const nextIds = existsNow
        ? favorites.filter(id => id !== ipoId)
        : [...favorites, ipoId];

      setFavorites(nextIds);

      if (existsNow) {
        // 즐겨찾기 해제 → 상세 리스트에서도 제거
        setFavoriteDetails(prev => prev.filter(x => x.code_id !== ipoId));
      } else {
        // 즐겨찾기 추가 → 해당 공모주만 개별 호출해서 append
        try {
          const data = await getIpoByCodeId(ipoId);
          const detail: IpoDetailData | undefined = Array.isArray(data)
            ? data[0]
            : data;

          if (detail) {
            setFavoriteDetails(prev => {
              if (prev.some(x => x.code_id === detail.code_id)) return prev;
              return [...prev, detail];
            });
          }
        } catch (e) {
          console.log('getIpoByCodeId error (single)', e);
        }
      }

      try {
        await toggleFavorite(ipoId);
      } catch (e) {
        console.log('toggleFavorite error', e);
      }
    },
    [favorites],
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My 페이지</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            나의 공모주 정보와 즐겨찾기를 한 번에 확인해요.
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 프로필 섹션 */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>JJ</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>닉네임</Text>
                <Text style={styles.profileEmail}>@google.com</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.linkText}>프로필 수정</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ⭐ 즐겨찾기 공모주 */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>⭐ 즐겨찾기 공모주</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>전체보기</Text>
              </TouchableOpacity>
            </View>

            {favoriteLoading && favoriteDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>
                  즐겨찾기 정보를 불러오는 중입니다...
                </Text>
              </View>
            ) : favoriteDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>
                  즐겨찾기한 공모주가 없습니다.
                </Text>
                <Text style={styles.emptySub}>
                  공모주 상세 화면에서 ⭐ 버튼을 눌러 즐겨찾기를 추가해보세요.
                </Text>
              </View>
            ) : (
              favoriteDetails.map((item) => {
                const id = item.code_id;
                const favorite = isFavorite(id);

                const priceNum = parseNumber(item.price ?? null);
                const confirmedPriceNum = parseNumber(
                  item.confirmedprice ?? null
                );
                const hasPrice = priceNum !== null;
                const hasConfirmed = confirmedPriceNum !== null;

                const displayPrice = hasPrice
                  ? priceNum
                  : hasConfirmed
                    ? confirmedPriceNum
                    : null;

                const priceLabel = hasPrice ? '현재가' : '공모가';

                const institutionRate =
                  item.institutional_competition_rate ?? null;

                return (
                  <TouchableOpacity
                    key={id}
                    style={styles.listRow}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/ipo/[codeId]',
                        params: { codeId: id },
                      })
                    }
                  >
                    <View style={styles.listRowLeft}>
                      {/* 종목명 */}
                      <Text style={styles.listTitle}>{item.company}</Text>

                      {/* 상장일 */}
                      {item.listingdate && (
                        <>
                          <Text style={styles.label}>상장일</Text>
                          <Text style={styles.value}>{item.listingdate}</Text>
                        </>
                      )}

                      {/* 청약 기간 */}
                      {item.subscriptiondate && (
                        <>
                          <Text style={styles.label}>청약일</Text>
                          <Text style={styles.value}>
                            {item.subscriptiondate.replace('~', ' ~ ')}
                          </Text>
                        </>
                      )}

                      {/* 공모가 / 현재가 */}
                      {displayPrice !== null && (
                        <>
                          <Text style={styles.label}>{priceLabel}</Text>
                          <Text style={styles.value}>
                            {displayPrice.toLocaleString()}원
                          </Text>
                        </>
                      )}
                      {/* 경쟁률 표시 우선순위: 청약 → 기관 */}
                      {item.competitionrate ? (
                        <>
                          <Text style={styles.label}>청약 경쟁률</Text>
                          <Text style={styles.valueHighlight}>
                            {item.competitionrate}
                          </Text>
                        </>
                      ) : item.institutional_competition_rate ? (
                        <>
                          <Text style={styles.label}>기관 경쟁률</Text>
                          <Text style={styles.valueHighlight}>
                            {item.institutional_competition_rate}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {/* 즐겨찾기 토글 버튼 */}
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => onToggleFavorite(id)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text
                        style={
                          favorite
                            ? styles.favoriteIconOn
                            : styles.favoriteIconOff
                        }
                      >
                        {favorite ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* 👀 최근 본 공모주 */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>👀 최근 본 공모주</Text>
              <View style={styles.recentHeaderRight}>
                <TouchableOpacity onPress={onClearRecent}>
                  <Text style={styles.linkText}>전체삭제</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recentHeaderRightItem}>
                  <Text style={styles.linkText}>전체보기</Text>
                </TouchableOpacity>
              </View>
            </View>

            {recentLoading && recentDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>
                  최근 본 공모주를 불러오는 중입니다...
                </Text>
              </View>
            ) : recentDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>최근 본 공모주가 없습니다.</Text>
                <Text style={styles.emptySub}>
                  공모주 상세 화면에 들어가면 여기에서 바로 확인할 수 있어요.
                </Text>
              </View>
            ) : (
              recentDetails.map((item) => (
                <TouchableOpacity
                  key={item.code_id}
                  style={styles.listRow}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/ipo/[codeId]',
                      params: { codeId: item.code_id },
                    })
                  }
                >
                  <View style={styles.listRowLeft}>
                    <Text style={styles.listTitle}>{item.company}</Text>
                    <Text style={styles.listSub}>최근에 조회한 공모주</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemoveRecent(item.code_id)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text style={styles.deleteText}>삭제</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* 내가 참여한 공모주 (샘플 데이터) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>📌 내가 참여한 공모주</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>전체보기</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.listRow}>
              <View>
                <Text style={styles.listTitle}>카카오모빌리티</Text>
                <Text style={styles.listSub}>
                  청약 완료 · 환불 예정 200,000원
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.listRow}>
              <View>
                <Text style={styles.listTitle}>삼성바이오로직스</Text>
                <Text style={styles.listSub}>상장 완료 · 평가 수익률 +12.3%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 알림 설정 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔔 알림 설정</Text>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>위젯 사용</Text>
              <Text style={styles.settingValue}>ON</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림 시간</Text>
              <Text style={styles.settingValue}>오전 9:00</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>
                청약 / 환불 / 상장일 D-Day 알림
              </Text>
              <Text style={styles.settingValue}>사용 중</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>알림 기록 보기</Text>
              <Text style={styles.settingValue}>최근 30일</Text>
            </TouchableOpacity>
          </View>

          {/* 앱 설정 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚙️ 앱 설정</Text>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>다크모드</Text>
              <Text style={styles.settingValue}>시스템 따라가기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>데이터 백업 / 복원</Text>
              <Text style={styles.settingValue}>클라우드 연동</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>약관 및 개인정보 처리방침</Text>
              <Text style={styles.settingValue}>보기</Text>
            </TouchableOpacity>

            <View style={styles.settingRowLast}>
              <Text style={styles.settingLabel}>앱 버전</Text>
              <Text style={styles.settingValue}>v1.0.0</Text>
            </View>
          </View>

          <View style={styles.scrollBottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',                     // 살짝 밝은 회색 톤
    borderBottomWidth: StyleSheet.hairlineWidth,    // 얇은 구분선
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  scrollBottomSpacer: {
    height: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  linkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB11',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  listRowLeft: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 2,
  },
  listSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  valueHighlight: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  settingRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  settingLabel: {
    fontSize: 13,
    color: '#111827',
  },
  settingValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  favoriteButton: {
    marginLeft: 8,
  },
  favoriteIconOn: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  favoriteIconOff: {
    fontSize: 20,
    color: '#D1D5DB',
  },
  emptyBox: {
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  recentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentHeaderRightItem: {
    marginLeft: 8,
  },
  headerIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

});
