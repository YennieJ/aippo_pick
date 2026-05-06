import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useJournalStockSearch } from '../hooks/useJournalQueries';
import type { JournalStockMaster } from '../types/journal.types';
import { formatKrwUnsigned } from '../utils/journal-ui.utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (stock: JournalStockMaster) => void;
};

export function StockPickerModal({ visible, onClose, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce: 입력이 멈춘 뒤에만 검색 요청
  // - 모달 오픈 직후에는 keyword 없이 최신 목록이 바로 떠야 하므로 즉시 set
  useEffect(() => {
    if (!visible) return;
    const trimmed = q.trim();
    if (!trimmed) {
      setDebouncedQ('');
      return;
    }
    const t = setTimeout(() => {
      setDebouncedQ(trimmed);
    }, 350);
    return () => clearTimeout(t);
  }, [q, visible]);

  // 모달 닫히면 입력/디바운스 상태 정리
  useEffect(() => {
    if (visible) return;
    setQ('');
    setDebouncedQ('');
  }, [visible]);

  const { items, isLoading, isFetching, errorMessage } = useJournalStockSearch(
    debouncedQ,
    visible,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={onClose}
          />
          <View className="rounded-t-[20px] bg-white pb-6 pt-3 dark:bg-gray-900 max-h-[80%]">
            <View className="self-center mb-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />

            <View className="px-5 pb-3">
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-2">
                종목 검색
              </Text>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="종목명 또는 종목코드"
                placeholderTextColor="#9ca3af"
                autoFocus
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </View>

            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item, idx) => {
                  const code = item.종목코드?.trim();
                  if (code) return `code:${code}`;
                  const name = item.종목명?.trim();
                  if (name) return `company:${name}:${idx}`;
                  return `row:${idx}`;
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ItemSeparatorComponent={() => (
                  <View className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />
                )}
                ListEmptyComponent={
                  !isFetching ? (
                    <View className="py-10 items-center">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {errorMessage ? errorMessage : '검색 결과가 없습니다.'}
                      </Text>
                      {!debouncedQ && !errorMessage && (
                        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          최근 3개월 내 상장 종목입니다. 더 이전 종목은
                          종목명/코드로 검색하세요.
                        </Text>
                      )}
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={item.이미등록됨 ? 1 : 0.7}
                    disabled={item.이미등록됨}
                    onPress={() => {
                      if (item.이미등록됨) return;
                      onSelect(item);
                      setQ('');
                    }}
                    className={`px-5 py-3 flex-row justify-between items-center ${
                      item.이미등록됨 ? 'opacity-50' : ''
                    }`}
                  >
                    <View className="shrink pr-3">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {item.종목명}
                        </Text>
                        {item.이미등록됨 && (
                          <View className="rounded-full bg-gray-200 px-2 py-0.5 dark:bg-gray-800">
                            <Text className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                              등록됨
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.종목코드 || '코드 없음'}
                        {item.상장일 ? ` · 상장일 ${item.상장일}` : ''}
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-700 dark:text-gray-300">
                      확정공모가 {formatKrwUnsigned(item.확정공모가)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
