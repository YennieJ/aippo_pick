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
  addRecentSearch,
  clearRecentSearches,
  loadRecentSearches,
  loadStringArray,
  removeRecentSearch,
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
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);

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

  // 검색 완료 시 최근 검색어에 자동 저장 (결과 유무와 관계없이)
  useEffect(() => {
    const saveSearchQuery = async () => {
      // 검색어가 없거나, 로딩 중이거나, 에러가 있으면 저장하지 않음
      if (!debouncedSearchQuery || searchLoading || searchError) return;

      try {
        const next = await addRecentSearch(debouncedSearchQuery);
        setRecentKeywords(next);
      } catch (e) {
        console.log('auto-save search error', e);
      }
    };

    saveSearchQuery();
  }, [searchLoading, searchError, debouncedSearchQuery]);

  // 화면 포커스 시: 스토리지 동기화 + 스크롤 최상단
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncFromStorage = async () => {
        try {
          const fav = await loadStringArray(STORAGE_KEYS.FAVORITES);
          const recent = await loadRecentSearches();

          if (isActive) {
            setFavorites(fav);
            setRecentKeywords(recent);
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

  // 검색 버튼(엔터) → 검색 + 검색어 저장
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

    // 엔터 키 = 명시적 검색 의도 → 검색어 저장 (검색 전에 저장)
    try {
      const next = await addRecentSearch(term);
      setRecentKeywords(next);
    } catch (e) {
      console.log('handleSubmitSearch save error', e);
    }

    // 저장 후 검색 실행
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

  // 검색 결과 아이템 클릭 → 상세 이동 + 최근검색에 저장
  const handlePressResultItem = async (item: SearchResult) => {
    try {
      const next = await addRecentSearch(item.company);
      setRecentKeywords(next);
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

  // 최근 검색어 클릭 → 검색창에 넣고 검색 + 사용 빈도 반영 (맨 위로 이동)
  const handlePressRecentKeyword = async (keyword: string) => {
    setSearchQuery(keyword);
    setDebouncedSearchQuery(keyword);

    // 사용 빈도 반영: 클릭 시마다 맨 위로 이동 (중복 제거 후 맨 앞에 추가)
    try {
      const next = await addRecentSearch(keyword);
      setRecentKeywords(next);
    } catch (e) {
      console.log('handlePressRecentKeyword error', e);
    }
  };

  // 최근 검색어 개별 삭제
  const handleRemoveRecentKeyword = async (keyword: string) => {
    try {
      const next = await removeRecentSearch(keyword);
      setRecentKeywords(next);
    } catch (e) {
      console.log('removeRecentSearch error', e);
    }
  };

  // 최근 검색어 전체 삭제
  const handleClearRecentKeywords = async () => {
    try {
      await clearRecentSearches();
      setRecentKeywords([]);
    } catch (e) {
      console.log('clearRecentSearches error', e);
    }
  };

  const showRecent = debouncedSearchQuery.length === 0; // 검색어 없으면 최근 검색어 화면

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-white dark:bg-black"
        contentContainerStyle={{ gap: 24 }}
      >
        {/* 헤더 */}
        <View className="py-5">
          <SectionHeader title="공모주 검색" />

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
          {/* 검색어가 없으면 → 최근 검색어 리스트 */}
          {showRecent ? (
            recentKeywords.length > 0 ? (
              <View>
                <View className="pb-4 px-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      최근 검색한 증권사
                    </Text>

                    <TouchableOpacity onPress={handleClearRecentKeywords}>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        전체 삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mx-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {recentKeywords.map((item) => (
                    <View key={item}>
                      <View className="flex-row items-center py-3 px-4 justify-between">
                        <TouchableOpacity
                          className="flex-row items-center flex-1"
                          activeOpacity={0.7}
                          onPress={() => handlePressRecentKeyword(item)}
                        >
                          <MaterialIcons
                            name="history"
                            size={18}
                            color={iconColor}
                            style={{ marginRight: 6 }}
                          />
                          <Text className="text-[15px] text-gray-900 dark:text-white">
                            {item}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveRecentKeyword(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={iconColor}
                          />
                        </TouchableOpacity>
                      </View>
                      <View className="h-px bg-gray-200 dark:border-gray-700 ml-4" />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-4">
                <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  최근 검색어가 없습니다. 공모주를 검색해 보세요.
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
