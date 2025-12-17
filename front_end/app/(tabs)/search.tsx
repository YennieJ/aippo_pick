import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback } from 'react';

import { searchAndResolve } from '../../src/features/ipo/api/ipo';
import {
    STORAGE_KEYS,
    loadStringArray,
    saveStringArray,
    loadRecentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
} from '../../src/shared/utils/storage.utils';

// ✅ 프로젝트 공통 다크모드 훅
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

const SEARCH_DEBOUNCE_MS = 300;

// company: 실제로는 "증권사 명 / 종목명"을 의미
type SearchResult = {
    company: string;
    code_id: string;
};

export default function SearchScreen() {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentKeywords, setRecentKeywords] = useState<string[]>([]);

    // 입력 포커스용 ref
    const inputRef = useRef<TextInput>(null);

    /* =========================================================
       🌗 다크모드 감지 (추가)
    ========================================================= */
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // ✅ 색상만 최소로 덮어쓰기 (추가)
    const BG = isDark ? '#0B1220' : '#F3F4F6';
    const CARD = isDark ? '#111827' : '#FFFFFF';
    const BORDER = isDark ? '#243244' : '#E5E7EB';
    const TEXT = isDark ? '#E5E7EB' : '#111827';
    const SUB_TEXT = isDark ? '#9CA3AF' : '#6B7280';
    const MUTED = '#9CA3AF';
    const DANGER = '#DC2626';

    // 즐겨찾기 & 최근 검색 초기 로딩
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

            // 포커스 빠질 때 cleanup
            return () => {
                isActive = false;
            };
        }, [])
    );

    // 페이지 진입 시 자동 포커스
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 80);
        return () => clearTimeout(timer);
    }, []);

    // 검색 API 호출
    const fetchSearchResults = async (keyword: string) => {
        const term = keyword.trim();
        if (!term) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        try {
            setSearchLoading(true);
            setSearchError(null);
            const data = await searchAndResolve(term);
            setSearchResults(data);
        } catch (e) {
            console.log('search error', e);
            setSearchError('검색 중 오류가 발생했어요.');
        } finally {
            setSearchLoading(false);
        }
    };

    // 입력 변경
    const handleChangeSearchText = (text: string) => {
        setSearchQuery(text);
    };

    // 검색 버튼(엔터) → 검색만 수행 (최근검색 저장 X)
    const handleSubmitSearch = async () => {
        const term = searchQuery.trim();
        if (!term) return;

        fetchSearchResults(term);
    };

    // 디바운스 검색
    useEffect(() => {
        const term = searchQuery.trim();
        if (!term) {
            setSearchResults([]);
            setSearchError(null);
            setSearchLoading(false);
            return;
        }

        const timer = setTimeout(() => {
            fetchSearchResults(term);
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 🔥 검색 결과 아이템 클릭 → 상세 이동 + 최근검색에 "증권사명(company)" 저장
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

    // ⭐ 즐겨찾기 토글 + 최근검색에 "증권사명(company)" 저장
    const handleToggleFavorite = async (item: SearchResult) => {
        try {
            // 1) 즐겨찾기 토글 (code_id 기준)
            const current = await loadStringArray(STORAGE_KEYS.FAVORITES);
            const exists = current.includes(item.code_id);
            const updated = exists
                ? current.filter((id) => id !== item.code_id)
                : [...current, item.code_id];

            await saveStringArray(STORAGE_KEYS.FAVORITES, updated);
            setFavorites(updated);

            // 2) 최근 검색어에 증권사명 추가
            const next = await addRecentSearch(item.company);
            setRecentKeywords(next);
        } catch (e) {
            console.log('handleToggleFavorite error', e);
        }
    };

    // 최근 검색어 클릭 → 검색창에 넣고 검색만 수행 (저장/갱신 X)
    const handlePressRecentKeyword = async (keyword: string) => {
        setSearchQuery(keyword);
        fetchSearchResults(keyword);
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

    const trimmedQuery = searchQuery.trim();
    const showRecent = trimmedQuery.length === 0; // 검색어 없으면 최근 검색어 화면

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: BG }]}>
            <View style={[styles.container, { backgroundColor: BG }]}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: TEXT }]}>공모주 검색</Text>

                    {/* 검색창 */}
                    <View
                        style={[
                            styles.searchBar,
                            { backgroundColor: CARD, borderColor: BORDER },
                        ]}
                    >
                        <MaterialIcons
                            name="search"
                            size={24}
                            color={MUTED}
                            style={{ marginRight: 8 }}
                        />

                        <TextInput
                            ref={inputRef}
                            style={[styles.searchInput, { color: TEXT }]}
                            placeholder="예) 삼성, 207940"
                            placeholderTextColor={MUTED}
                            value={searchQuery}
                            onChangeText={handleChangeSearchText}
                            onSubmitEditing={handleSubmitSearch}
                            returnKeyType="search"
                            autoFocus
                            blurOnSubmit={false}
                        />
                    </View>
                </View>

                {/* 본문 영역 */}
                <View style={styles.resultContainer}>
                    {/* 검색어가 없으면 → 최근 검색어 리스트 */}
                    {showRecent ? (
                        recentKeywords.length > 0 ? (
                            <View>
                                <View style={styles.recentHeader}>
                                    <Text style={[styles.recentTitle, { color: TEXT }]}>
                                        최근 검색한 증권사
                                    </Text>

                                    <TouchableOpacity onPress={handleClearRecentKeywords}>
                                        <Text style={[styles.recentClearText, { color: MUTED }]}>
                                            전체 삭제
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {recentKeywords.map((item) => (
                                    <View key={item}>
                                        <View style={styles.recentItemRow}>
                                            <TouchableOpacity
                                                style={styles.recentKeywordBox}
                                                activeOpacity={0.7}
                                                onPress={() => handlePressRecentKeyword(item)}
                                            >
                                                <MaterialIcons
                                                    name="history"
                                                    size={18}
                                                    color={MUTED}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text
                                                    style={[
                                                        styles.recentKeywordText,
                                                        { color: TEXT },
                                                    ]}
                                                >
                                                    {item}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => handleRemoveRecentKeyword(item)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <MaterialIcons name="close" size={18} color={MUTED} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={[styles.separator, { backgroundColor: BORDER }]} />
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.centerBox}>
                                <Text style={[styles.emptyText, { color: SUB_TEXT }]}>
                                    최근 검색어가 없습니다. 공모주를 검색해 보세요.
                                </Text>
                            </View>
                        )
                    ) : (
                        // 검색어가 있으면 → 검색 결과 영역
                        <>
                            {searchLoading && (
                                <View style={styles.centerBox}>
                                    <ActivityIndicator />
                                </View>
                            )}

                            {!searchLoading && searchError && (
                                <View style={styles.centerBox}>
                                    <Text style={[styles.errorText, { color: DANGER }]}>
                                        {searchError}
                                    </Text>
                                </View>
                            )}

                            {!searchLoading &&
                                !searchError &&
                                searchResults.length === 0 &&
                                trimmedQuery.length > 0 && (
                                    <View style={styles.centerBox}>
                                        <Text style={[styles.emptyText, { color: SUB_TEXT }]}>
                                            검색 결과가 없어요.
                                        </Text>
                                    </View>
                                )}

                            {!searchLoading && searchResults.length > 0 && (
                                <FlatList<SearchResult>
                                    data={searchResults}
                                    keyExtractor={(item) => item.code_id + item.company}
                                    keyboardShouldPersistTaps="always"
                                    ItemSeparatorComponent={() => (
                                        <View style={[styles.separator, { backgroundColor: BORDER }]} />
                                    )}
                                    renderItem={({ item }) => {
                                        const isFavorite = favorites.includes(item.code_id);

                                        return (
                                            <View style={styles.resultItem}>
                                                {/* 상세 이동 + 최근검색 저장 */}
                                                <TouchableOpacity
                                                    style={{ flex: 1 }}
                                                    activeOpacity={0.7}
                                                    onPress={() => handlePressResultItem(item)}
                                                >
                                                    <View style={styles.resultTextBox}>
                                                        <Text
                                                            style={[
                                                                styles.resultCompany,
                                                                { color: TEXT },
                                                            ]}
                                                        >
                                                            {item.company}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.resultCode,
                                                                { color: SUB_TEXT },
                                                            ]}
                                                        >
                                                            {item.code_id}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>

                                                {/* 즐겨찾기 + 최근검색 저장 */}
                                                <TouchableOpacity
                                                    style={styles.favoriteButton}
                                                    onPress={() => handleToggleFavorite(item)}
                                                >
                                                    <MaterialIcons
                                                        name={isFavorite ? 'star' : 'star-border'}
                                                        size={22}
                                                        color={isFavorite ? '#FACC15' : MUTED}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    }}
                                />
                            )}
                        </>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    header: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    searchBar: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    resultContainer: {
        flex: 1,
        marginTop: 16,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 14,
        color: '#DC2626',
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginLeft: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    resultTextBox: {
        gap: 4,
    },
    resultCompany: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    resultCode: {
        fontSize: 13,
        color: '#6B7280',
    },
    favoriteButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    // 최근 검색 스타일
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    recentTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    recentClearText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    recentItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        justifyContent: 'space-between',
    },
    recentKeywordBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recentKeywordText: {
        fontSize: 15,
        color: '#111827',
    },
});
