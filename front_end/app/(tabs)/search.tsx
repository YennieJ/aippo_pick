import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIpoSearch } from '../../src/features/ipo/hooks/useIpoQueries';
import {
  STORAGE_KEYS,
  loadStringArray,
  saveStringArray,
} from '../../src/shared/utils/storage.utils';

import { SectionHeader } from '../../src/shared';

const SEARCH_DEBOUNCE_MS = 300;

// company: 실제로는 "증권사 명 / 종목명"을 의미
type SearchResult = {
  company: string;
  code_id: string;
};

export default function SearchScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentViewedItems, setRecentViewedItems] = useState<SearchResult[]>([]);

  // 스크롤뷰 ref
  const scrollViewRef = useRef<ScrollView>(null);
  // 디바운스 타이머 ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 아이콘 색상 상수
  const iconColor = '#9CA3AF';

  // 리액트 쿼리로 검색
  const {
    data: searchResults = [],
    isLoading: searchLoading,
    error: searchError,
  } = useIpoSearch(debouncedSearchQuery);

  // 화면 포커스 시: 스토리지 동기화 + 스크롤 최상단
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncFromStorage = async () => {
        try {
          const fav = await loadStringArray(STORAGE_KEYS.FAVORITES);
          // 최근 검색 결과 로드 (검색 페이지 전용)
          const recentIpoJson = await loadStringArray(
            STORAGE_KEYS.RECENT_SEARCH_RESULTS
          );
          const recentIpo: SearchResult[] = recentIpoJson
            .map((json) => {
              try {
                return JSON.parse(json);
              } catch {
                return null;
              }
            })
            .filter((item): item is SearchResult => {
              // null이 아니고, company와 code_id가 모두 있는 유효한 항목만 필터링
              return (
                item !== null &&
                typeof item.company === 'string' &&
                typeof item.code_id === 'string' &&
                item.company.trim() !== '' &&
                item.code_id.trim() !== ''
              );
            });

          if (isActive) {
            setFavorites(fav);
            setRecentViewedItems(recentIpo);
          }
        } catch (e) {
          console.log('sync favorites/recent error', e);
        }
      };

      syncFromStorage();
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      return () => {
        isActive = false;
      };
    }, [])
  );

  // 검색 버튼(엔터) → 검색만 실행
  const handleSubmitSearch = async () => {
    const term = searchQuery.trim();
    if (!term) return;

    // 검색어를 trim된 값으로 업데이트 (앞뒤 공백 제거)
    setSearchQuery(term);

    // 디바운스 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 검색 실행
    setDebouncedSearchQuery(term);
  };

  // 디바운스 검색
  useEffect(() => {
    const trimmed = searchQuery.trim();

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(trimmed);
      debounceTimerRef.current = null;
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchQuery]);

  // 검색 결과 아이템 클릭 → 최근 본 공모주에 저장 + 상세 이동
  const handlePressResultItem = async (item: SearchResult) => {
    try {
      // 유효성 검사: company와 code_id가 모두 있어야 저장
      if (!item.company || !item.code_id) {
        console.log('Invalid item data, skipping save:', item);
        router.push(`/ipo/${item.code_id}`);
        return;
      }

      // 최근 본 공모주에 추가 (중복 제거 후 맨 앞에 추가)
      const filtered = recentViewedItems.filter((i) => i.code_id !== item.code_id);
      const updated = [item, ...filtered].slice(0, 10); // 최대 10개 유지

      // 스토리지에 저장 (JSON 문자열 배열로) - 검색 페이지 전용 스토리지
      const jsonArray = updated.map((i) => JSON.stringify(i));
      await saveStringArray(STORAGE_KEYS.RECENT_SEARCH_RESULTS, jsonArray);
      setRecentViewedItems(updated);
    } catch (e) {
      console.log('handlePressResultItem error', e);
    } finally {
      router.push(`/ipo/${item.code_id}`);
    }
  };

  // 즐겨찾기 토글 (최근 검색어에 추가하지 않음)
  const handleToggleFavorite = async (item: SearchResult) => {
    try {
      const exists = favorites.includes(item.code_id);
      const updated = exists
        ? favorites.filter((id) => id !== item.code_id)
        : [...favorites, item.code_id];

      await saveStringArray(STORAGE_KEYS.FAVORITES, updated);
      setFavorites(updated);
    } catch (e) {
      console.log('handleToggleFavorite error', e);
    }
  };

  // 최근 본 공모주 클릭 → 상세 페이지로 바로 이동
  const handlePressRecentItem = async (item: SearchResult) => {
    router.push(`/ipo/${item.code_id}`);
  };

  // 최근 검색 결과 개별 삭제
  const handleRemoveRecentItem = async (codeId: string) => {
    try {
      const updated = recentViewedItems.filter((item) => item.code_id !== codeId);
      const jsonArray = updated.map((i) => JSON.stringify(i));
      await saveStringArray(STORAGE_KEYS.RECENT_SEARCH_RESULTS, jsonArray);
      setRecentViewedItems(updated);
    } catch (e) {
      console.log('removeRecentItem error', e);
    }
  };

  // 최근 검색 결과 전체 삭제
  const handleClearRecentItems = async () => {
    try {
      await saveStringArray(STORAGE_KEYS.RECENT_SEARCH_RESULTS, []);
      setRecentViewedItems([]);
    } catch (e) {
      console.log('clearRecentItems error', e);
    }
  };

  const showRecent = debouncedSearchQuery.length === 0; // 검색어 없으면 최근 검색 결과 화면

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ gap: 24 }}
      >
        {/* 헤더 */}
        <View className="py-5">
          <SectionHeader title="공모주 검색" showPlayStoreOnWeb/>

          {/* 검색창 */}
          <View className="flex-row items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 mx-4">
            <MaterialIcons
              name="search"
              size={24}
              color={iconColor}
              style={{ marginRight: 8 }}
            />

            <TextInput
              className="flex-1 text-base text-gray-900 dark:text-white"
              placeholder="예) 삼성, 207940"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSubmitSearch}
              returnKeyType="search"
              autoFocus
              blurOnSubmit={false}
              multiline={false}
              numberOfLines={1}
            />
          </View>
        </View>

        {/* 본문 영역 */}
        <View className="pb-6">
          {/* 검색어가 없으면 → 최근 검색 결과 리스트 */}
          {showRecent ? (
            recentViewedItems.length > 0 ? (
              <View>
                <View className="pb-4 px-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      최근 검색 결과
                    </Text>

                    <TouchableOpacity onPress={handleClearRecentItems}>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        전체 삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {recentViewedItems.map((item, index) => (
                    <View key={item.code_id}>
                      <View className="flex-row items-center py-3 px-4 justify-between">
                        <TouchableOpacity
                          className="flex-1"
                          activeOpacity={0.7}
                          onPress={() => handlePressRecentItem(item)}
                        >
                          <View className="gap-1">
                            <Text className="text-base font-semibold text-gray-900 dark:text-white">
                              {item.company}
                            </Text>
                            <Text className="text-sm text-gray-600 dark:text-gray-400">
                              {item.code_id}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveRecentItem(item.code_id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={iconColor}
                          />
                        </TouchableOpacity>
                      </View>
                      {index < recentViewedItems.length - 1 && (
                        <View className="h-px bg-gray-200 dark:border-gray-700 ml-4" />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-4">
                <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  최근 검색 결과가 없습니다. 공모주를 검색해보세요.
                </Text>
              </View>
            )
          ) : (
            // 검색어가 있으면 → 검색 결과 영역
            <>
              <View className="pb-4 px-4">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  검색 결과
                </Text>
              </View>

              {searchLoading && (
                <View className="items-center justify-center py-8">
                  <ActivityIndicator />
                </View>
              )}

              {!searchLoading && searchError && (
                <View className="items-center justify-center px-4 py-8">
                  <Text className="text-sm text-red-600 dark:text-red-400 text-center">
                    검색 중 오류가 발생했어요.
                  </Text>
                </View>
              )}

              {!searchLoading &&
                !searchError &&
                searchResults.length === 0 &&
                debouncedSearchQuery.length > 0 && (
                  <View className="items-center justify-center px-4 py-8">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      검색 결과가 없어요.
                    </Text>
                  </View>
                )}

              {!searchLoading && !searchError && searchResults.length > 0 && (
                <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {searchResults.map((item, index) => {
                    const isFavorite = favorites.includes(item.code_id);

                    return (
                      <View key={item.code_id + item.company}>
                        <View className="flex-row items-center py-3 px-4">
                          {/* 상세 이동 */}
                          <TouchableOpacity
                            className="flex-1"
                            activeOpacity={0.7}
                            onPress={() => handlePressResultItem(item)}
                          >
                            <View className="gap-1">
                              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                                {item.company}
                              </Text>
                              <Text className="text-sm text-gray-600 dark:text-gray-400">
                                {item.code_id}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* 즐겨찾기 토글 */}
                          <TouchableOpacity
                            className="px-3 py-2"
                            onPress={() => handleToggleFavorite(item)}
                          >
                            <MaterialIcons
                              name={isFavorite ? 'star' : 'star-border'}
                              size={22}
                              color={isFavorite ? '#FACC15' : iconColor}
                            />
                          </TouchableOpacity>
                        </View>
                        {index < searchResults.length - 1 && (
                          <View className="h-px bg-gray-200 dark:border-gray-700 ml-4" />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
