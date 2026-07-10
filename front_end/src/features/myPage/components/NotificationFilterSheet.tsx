import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../shared';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';

type Props = {
  visible: boolean;
  allBrokers: any[];
  /** 백엔드 값(포함 의미): true = 해당 종목 포함 */
  initialSpac: boolean;
  initialReits: boolean;
  /** 선택된 증권사 이름 목록 (빈 배열 = 전체) */
  initialBrokers: string[];
  onClose: () => void;
  /** "적용" 시 백엔드 포함값 그대로 반환 (spac/reits: true=포함) */
  onApply: (spac: boolean, reits: boolean, brokers: string[]) => void;
};

/**
 * 알림 필터 바텀시트 — 달력 CalendarFilterModal과 동일한 형식.
 * 조회 종목(스펙 제외/리츠 제외) + 증권사 다중선택 + 적용.
 * UI는 "제외" 의미로 표시하지만 백엔드 spac/reits는 "포함" 값을 유지(체크=제외=false).
 */
export function NotificationFilterSheet({
  visible,
  allBrokers,
  initialSpac,
  initialReits,
  initialBrokers,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9CA3AF' : '#666';

  // 내부 임시 상태 (백엔드 포함값 기준)
  const [spac, setSpac] = useState(initialSpac);
  const [reits, setReits] = useState(initialReits);
  const [brokers, setBrokers] = useState<string[]>(initialBrokers);

  useEffect(() => {
    if (visible) {
      setSpac(initialSpac);
      setReits(initialReits);
      setBrokers(initialBrokers);
    }
  }, [visible, initialSpac, initialReits, initialBrokers]);

  const toggleBroker = (name: string) =>
    setBrokers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-800 rounded-t-[20px] max-h-[90%] min-h-[70%] flex-col">
          <View className="flex-row justify-between items-center p-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              알림 필터
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <IconSymbol name="xmark" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 min-h-0"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* 조회 종목 (제외) */}
            <View className="px-5 pt-2 pb-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
              <Text className="text-base font-semibold text-[#333] dark:text-white mb-3">
                조회 종목
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={() => setSpac((v) => !v)}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      !spac
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {!spac && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    스펙 제외
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={() => setReits((v) => !v)}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      !reits
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {!reits && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    리츠 제외
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 증권사 */}
            <View className="px-5 pt-2">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold text-[#333] dark:text-white">
                  증권사
                </Text>
                <TouchableOpacity
                  className={`px-3 py-1.5 rounded ${
                    brokers.length === 0
                      ? 'bg-[#f0f0f0] dark:bg-gray-700 opacity-50'
                      : 'bg-[#f5f5f5] dark:bg-gray-700'
                  }`}
                  onPress={() => setBrokers([])}
                  disabled={brokers.length === 0}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      brokers.length === 0
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
                  const isSelected = brokers.includes(broker.broker_name);
                  return (
                    <TouchableOpacity
                      key={broker.broker_id}
                      className="flex-row justify-between items-center px-2 py-3"
                      onPress={() => toggleBroker(broker.broker_name)}
                    >
                      <Text className="text-base font-medium text-gray-900 dark:text-white">
                        {broker.broker_name}
                      </Text>
                      <View
                        className={`w-6 h-6 border-2 rounded items-center justify-center ${
                          isSelected
                            ? 'bg-[#4A90E2] border-[#4A90E2]'
                            : 'border-[#ddd] dark:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <IconSymbol name="checkmark" size={18} color="#fff" />
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
            style={{ marginBottom: insets.bottom }}
            onPress={() => {
              onApply(spac, reits, brokers);
              onClose();
            }}
          >
            <Text className="text-white text-base font-bold">적용</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
