import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import axios from 'axios';
import * as Notifications from 'expo-notifications';

import {
  loadStringArray,
  removeItem,
  saveStringArray,
  STORAGE_KEYS,
} from '../../src/shared/utils/storage.utils';
import { getIpoByCodeId } from '../../src/features/ipo/api/ipo';
import { IpoDetailData } from '../../src/features/ipo/types/ipo.types';

import * as Application from 'expo-application';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/* =========================================================
   🔐 1) 앱 전용 고정 Device ID 생성/로드
========================================================= */
let cachedDeviceId: string | null = null;

async function getStableDeviceId() {
  console.log('getStableDeviceId 진입', cachedDeviceId);
  if (cachedDeviceId) return cachedDeviceId;

  let id = Application.getAndroidId();

  // iOS fallback
  if (!id) {
    // iOS는 안드로이드ID가 없으니 앱+버전 조합으로 안정적 fallback 생성
    id = `${Application.applicationId}-${Application.nativeApplicationVersion}`;
  }

  cachedDeviceId = id;
  console.log('cachedDeviceId = id', cachedDeviceId);
  return id;
}

/** =========================================================
 *  날짜 유틸: listingdate(YYYY.MM.DD | YYYY-MM-DD) → Date
 * ======================================================= */
function parseYmdToDate(value?: string | null): Date | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (!y || !m || !d) return null;

  // 날짜 비교 안정성 위해 정오로 생성
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** =========================================================
 * 오늘 기준 D-day 계산
 * ======================================================= */
function calcDDay(target: Date): number {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatDDayLabel(diff: number): string {
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export default function MyPageScreen() {
  const router = useRouter();

  // 문자열("24,650", " 8,000원") → 숫자로 안전하게 변환
  const parseNumber = (value?: string | null): number | null => {
    if (!value) return null;

    // 숫자, -, . 만 남기고 다 제거
    const cleaned = value.replace(/[^\d.-]/g, '').trim();
    if (!cleaned) return null;

    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  // 🔔 전체 알림 스위치 상태
  const [notifyAll, setNotifyAll] = useState(false);
  const [notifySpac, setNotifySpac] = useState(true);
  const [notifyReits, setNotifyReits] = useState(true);

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

  // 🔔 서버에 알림 설정 저장
  async function saveNotifyAll(newValue: boolean) {
    try {
      const deviceId = await getStableDeviceId();

      await axios.put('http://122.42.248.81:4000/notification_setting', {
        deviceId,
        notifyAll: newValue,
        broker: '',
        spac: true,
        reits: true,
        alarmTime: '08:00',
      });

      console.log('⭐ notifyAll updated:', newValue);
    } catch (e) {
      console.log('notifyAll 업데이트 실패:', e);
    }
  }

  async function loadNotifySetting() {
    try {
      const deviceId = await getStableDeviceId();
      const res = await axios.get(
        `http://122.42.248.81:4000/notification_setting/${deviceId}`
      );
      return res.data;
    } catch (e) {
      console.log('알림 설정 로딩 실패:', e);
      return null;
    }
  }

  // ⭐⭐⭐ 그 다음이 기존 Hook들 시작 영역
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteDetails, setFavoriteDetails] = useState<IpoDetailData[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [recentDetails, setRecentDetails] = useState<IpoDetailData[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchIpoDetailsByIds = useCallback(
    async (ids: string[]): Promise<IpoDetailData[]> => {
      if (!ids.length) return [];

      const results = await Promise.all(
        ids.map(async (codeId) => {
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
        })
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
    []
  );

  const isFavorite = useCallback(
    (ipoId: string) => favorites.includes(ipoId),
    [favorites]
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

        const map = new Map(details.map((d) => [d.code_id, d]));
        const ordered = [...ids]
          .reverse()
          .map((id) => map.get(id))
          .filter(Boolean) as IpoDetailData[];

        setFavoriteDetails(ordered);
      } finally {
        setFavoriteLoading(false);
      }
    },
    [fetchIpoDetailsByIds]
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
    [fetchIpoDetailsByIds]
  );

  // 탭 포커스시 즐겨찾기 + 최근 본 동시 로딩
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const [favoriteList, recentList] = await Promise.all([
            loadStringArray(STORAGE_KEYS.FAVORITES),
            loadStringArray(STORAGE_KEYS.RECENT_IPO),
          ]);
          if (cancelled) return;

          console.log('⭐ MyPage favorites:', favoriteList);
          console.log('👀 MyPage recent:', recentList);

          setFavorites(favoriteList);

          await Promise.all([
            loadFavoriteDetails(favoriteList),
            loadRecentDetails(recentList),
          ]);

          const notify = await loadNotifySetting();
          if (!cancelled && notify) {
            setNotifyAll(notify.notifyAll === true);
            if (typeof notify.spac === 'boolean') setNotifySpac(notify.spac);
            if (typeof notify.reits === 'boolean') setNotifyReits(notify.reits);
          }
        } catch (e) {
          console.log('MyPage load error', e);
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [loadFavoriteDetails, loadRecentDetails])
  );

  // 최근 본 전체 삭제
  const onClearRecent = useCallback(async () => {
    try {
      await removeItem(STORAGE_KEYS.RECENT_IPO);
      setRecentDetails([]);
    } catch (e) {
      console.log('onClearRecent error', e);
    }
  }, []);

  // 즐겨찾기 전체 삭제
  const onClearFavorites = useCallback(async () => {
    try {
      await removeItem(STORAGE_KEYS.FAVORITES);
      setFavorites([]);
      setFavoriteDetails([]);
    } catch (e) {
      console.log('onClearFavorites error', e);
    }
  }, []);

  // 최근 본 한 줄 삭제
  const onRemoveRecent = useCallback(async (ipoId: string) => {
    try {
      const current = await loadStringArray(STORAGE_KEYS.RECENT_IPO);
      const next = current.filter((id) => id !== ipoId);
      await saveStringArray(STORAGE_KEYS.RECENT_IPO, next);
      setRecentDetails((prev) => prev.filter((item) => item.code_id !== ipoId));
    } catch (e) {
      console.log('onRemoveRecent error', e);
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

      if (existsNow) {
        setFavoriteDetails((prev) => prev.filter((x) => x.code_id !== ipoId));
      } else {
        try {
          const data = await getIpoByCodeId(ipoId);
          const detail: IpoDetailData | undefined = Array.isArray(data)
            ? data[0]
            : data;

          if (detail) {
            setFavoriteDetails((prev) => {
              if (prev.some((x) => x.code_id === detail.code_id)) return prev;
              return [...prev, detail];
            });
          }
        } catch (e) {
          console.log('getIpoByCodeId error (single)', e);
        }
      }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>My 페이지</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ backgroundColor: BG }}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ✅ 알림 설정 (이모티콘/아이콘 삭제 + 스위치 색 제거) */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>알림 설정</Text>
            </View>

            {/* 전체 알림 */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeftNoIcon}>
                <Text style={styles.settingLabel}>전체 알림</Text>
              </View>

              {/* ✅ 체크 색 제거: trackColor/thumbColor 지정 안함 */}
              <Switch
                value={notifyAll}
                onValueChange={async (newValue) => {
                  if (newValue === true) {
                    const ok = await ensureNotificationPermission();
                    if (!ok) return;
                  }

                  setNotifyAll(newValue);
                  await saveNotifyAll(newValue);
                }}
              />
            </View>

            {/* SPAC 알림 (✅ 토글 동작하도록 state 연결) */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeftNoIcon}>
                <Text style={styles.settingLabel}>SPAC 알림</Text>
              </View>
              <Switch
                value={notifySpac}
                onValueChange={async (newValue) => {
                  if (newValue === true) {
                    const ok = await ensureNotificationPermission();
                    if (!ok) return;
                  }
                  setNotifySpac(newValue);
                }}
              />
            </View>

            {/* REITS 알림 (✅ 토글 동작하도록 state 연결) */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeftNoIcon}>
                <Text style={styles.settingLabel}>REITS 알림</Text>
              </View>
              <Switch
                value={notifyReits}
                onValueChange={async (newValue) => {
                  if (newValue === true) {
                    const ok = await ensureNotificationPermission();
                    if (!ok) return;
                  }
                  setNotifyReits(newValue);
                }}
              />
            </View>

            {/* 알림 시간 */}
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.8}>
              <View style={styles.settingLeftNoIcon}>
                <Text style={styles.settingLabel}>알림 시간</Text>
              </View>

              <View style={styles.settingRight}>
                <Text style={styles.settingValueStrong}>08:00</Text>
                <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            {/* 증권사 알림 */}
            <TouchableOpacity style={styles.settingRowLast} activeOpacity={0.8}>
              <View style={styles.settingLeftNoIcon}>
                <Text style={styles.settingLabel}>증권사 알림</Text>
              </View>

              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>전체</Text>
                <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ⭐ 즐겨찾기 공모주 (전체보기 제거 → 전체삭제로 변경) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleNoMb}>⭐ 즐겨찾기 공모주</Text>
              </View>

              <TouchableOpacity onPress={onClearFavorites} activeOpacity={0.8}>
                <View style={styles.dangerPill}>
                  <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                  <Text style={styles.dangerPillText}>전체삭제</Text>
                </View>
              </TouchableOpacity>
            </View>

            {favoriteLoading && favoriteDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>즐겨찾기 정보를 불러오는 중입니다.</Text>
              </View>
            ) : favoriteDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>즐겨찾기한 공모주가 없습니다.</Text>
                <Text style={styles.emptySub}>
                  공모주 상세 화면에서 ⭐ 버튼을 눌러 즐겨찾기를 추가해보세요.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {favoriteDetails.map((item) => {
                  const id = item.code_id;
                  const favorite = isFavorite(id);
                  const { displayPrice, priceLabel } = getDisplayPrice(item);

                  const listingDate = parseYmdToDate(item.listingdate ?? null);
                  const dText = listingDate
                    ? formatDDayLabel(calcDDay(listingDate))
                    : null;

                  const rate =
                    item.competitionrate ??
                    item.institutional_competition_rate ??
                    null;

                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.homeCard}
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: '/ipo/[codeId]',
                          params: { codeId: id },
                        })
                      }
                    >
                      <View style={styles.homeCardTopRow}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            상장{dText ? ` ${dText}` : ''}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => onToggleFavorite(id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                      </View>

                      <Text style={styles.homeCardTitle} numberOfLines={1}>
                        {item.company}
                      </Text>

                      {displayPrice !== null && (
                        <View style={styles.homeCardInfoRow}>
                          <Text style={styles.homeCardInfoLabel}>{priceLabel}</Text>
                          <Text style={styles.homeCardInfoValue}>
                            {displayPrice.toLocaleString()}원
                          </Text>
                        </View>
                      )}

                      {rate && (
                        <View style={styles.homeCardInfoRow}>
                          <Text style={styles.homeCardInfoLabel}>경쟁률</Text>
                          <Text style={styles.homeCardRateStrong} numberOfLines={1}>
                            {rate}
                          </Text>
                        </View>
                      )}

                      <View style={styles.homeCardFooter}>
                        <Text style={styles.homeCardFooterText}>자세히 보기</Text>
                        <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* 👀 최근 본 공모주 */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleNoMb}>👀 최근 본 공모주</Text>
              </View>

              <TouchableOpacity onPress={onClearRecent} activeOpacity={0.8}>
                <View style={styles.dangerPill}>
                  <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                  <Text style={styles.dangerPillText}>전체삭제</Text>
                </View>
              </TouchableOpacity>
            </View>

            {recentLoading && recentDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>최근 본 공모주를 불러오는 중입니다.</Text>
              </View>
            ) : recentDetails.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>최근 본 공모주가 없습니다.</Text>
                <Text style={styles.emptySub}>
                  공모주 상세 화면에 들어가면 여기에서 바로 확인할 수 있어요.
                </Text>
              </View>
            ) : (
              recentDetails.map((item, idx) => {
                const isLast = idx === recentDetails.length - 1;

                return (
                  <TouchableOpacity
                    key={item.code_id}
                    style={isLast ? styles.listRowLast : styles.listRow}
                    activeOpacity={0.85}
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

                    <View style={styles.listRowRight}>
                      <TouchableOpacity
                        onPress={() => onRemoveRecent(item.code_id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.deleteText}>삭제</Text>
                      </TouchableOpacity>
                      <MaterialIcons name="chevron-right" size={22} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ⚙️ 앱 설정 */}
          <View style={styles.card}>
            <Text style={styles.cardTitlePlain}>⚙️ 앱 설정</Text>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/termAndConditions')}
              activeOpacity={0.8}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconChip, { backgroundColor: '#F3F4F6' }]}>
                  <MaterialIcons name="policy" size={18} color="#111827" />
                </View>
                <Text style={styles.settingLabel}>약관 및 개인정보 처리방침</Text>
              </View>

              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>보기</Text>
                <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <View style={styles.settingRowLast}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconChip, { backgroundColor: '#F3F4F6' }]}>
                  <MaterialIcons name="info-outline" size={18} color="#111827" />
                </View>
                <Text style={styles.settingLabel}>앱 버전</Text>
              </View>

              <Text style={styles.settingValue}>v1.0.0</Text>
            </View>
          </View>

          <View style={styles.scrollBottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   ✅ 디자인 리워크(요청 반영)
   - "내 설정" / "알림 설정" 이모티콘/아이콘 제거
   - 알림 Switch 색 지정 제거(기본색)
   - SPAC/REITS 스위치 state 연결해서 토글되게 수정
   - 즐겨찾기: "전체보기" 제거 → "전체삭제" 추가
========================================================= */

const BG = '#F6F7FB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const BORDER_STRONG = '#D1D5DB';

const ROW_H = 54;
const PAD_X = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: BG,
  },
  scrollBottomSpacer: { height: 28 },

  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 18px rgba(17,24,39,0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      },
    }),
  },

  cardTitleRow: {
    paddingHorizontal: PAD_X,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  cardTitlePlain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: PAD_X,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAD_X,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardTitleNoMb: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  dangerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerPillText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '800',
  },

  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  settingLeftNoIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  settingRow: {
    minHeight: ROW_H,
    paddingHorizontal: PAD_X,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_STRONG,
  },
  settingRowLast: {
    minHeight: ROW_H,
    paddingHorizontal: PAD_X,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: { fontSize: 13, color: '#111827', fontWeight: '700' },
  settingValue: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  settingValueStrong: { fontSize: 12, color: '#111827', fontWeight: '900' },

  horizontalList: {
    paddingVertical: 14,
    paddingHorizontal: PAD_X,
    gap: 12,
  },
  homeCard: {
    width: 228,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  homeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
  },

  homeCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },

  homeCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  homeCardInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  homeCardInfoValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '900',
  },
  homeCardRateStrong: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '900',
  },

  homeCardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeCardFooterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '800',
  },

  listRow: {
    minHeight: ROW_H,
    paddingHorizontal: PAD_X,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_STRONG,
  },
  listRowLast: {
    minHeight: ROW_H,
    paddingHorizontal: PAD_X,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  listRowLeft: { flex: 1 },
  listRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listTitle: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '900',
    marginBottom: 2,
  },
  listSub: { marginTop: 2, fontSize: 12, color: '#6B7280', fontWeight: '600' },
  deleteText: { fontSize: 12, color: '#9CA3AF', fontWeight: '800' },

  favoriteIconOn: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' },
  favoriteIconOff: { fontSize: 18, color: '#D1D5DB' },

  emptyBox: { paddingVertical: 18, paddingHorizontal: PAD_X },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#374151',
    marginBottom: 4,
  },
  emptySub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
});
