import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalendarFilterModalProps {
  visible: boolean;
  onClose: () => void;
  allBrokers: any[];
  tempSelectedBrokers: string[];
  tempExcludeSpec: boolean;
  tempExcludeReits: boolean;
  onToggleBroker: (brokerName: string) => void;
  onResetToAll: () => void;
  onToggleExcludeSpec: () => void;
  onToggleExcludeReits: () => void;
  onApply: () => void;
}

export default function CalendarFilterModal({
  visible,
  onClose,
  allBrokers,
  tempSelectedBrokers,
  tempExcludeSpec,
  tempExcludeReits,
  onToggleBroker,
  onResetToAll,
  onToggleExcludeSpec,
  onToggleExcludeReits,
  onApply,
}: CalendarFilterModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="bg-white dark:bg-gray-800 rounded-t-[20px] max-h-[85%] min-h-[500px] flex-col">
          <View className="flex-row justify-between items-center p-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              캘린더 필터
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-2xl text-[#666] dark:text-gray-400">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 min-h-0"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* 조회 종목 필터 */}
            <View className="px-5 py-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
              <Text className="text-base font-semibold text-[#333] dark:text-white mb-3">
                조회 종목
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={onToggleExcludeSpec}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      tempExcludeSpec
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {tempExcludeSpec && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    스펙 제외
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={onToggleExcludeReits}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      tempExcludeReits
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {tempExcludeReits && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    리츠 제외
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 증권사 필터 */}
            <View className="px-5 py-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-semibold text-[#333] dark:text-white">
                  증권사
                </Text>
                <TouchableOpacity
                  className={`px-3 py-1.5 rounded ${
                    tempSelectedBrokers.length === 0
                      ? 'bg-[#f0f0f0] dark:bg-gray-700 opacity-50'
                      : 'bg-[#f5f5f5] dark:bg-gray-700'
                  }`}
                  onPress={onResetToAll}
                  disabled={tempSelectedBrokers.length === 0}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      tempSelectedBrokers.length === 0
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
                  const isSelected = tempSelectedBrokers.includes(
                    broker.broker_name
                  );
                  return (
                    <TouchableOpacity
                      key={broker.broker_id}
                      className="flex-row justify-between items-center px-5 py-3"
                      onPress={() => onToggleBroker(broker.broker_name)}
                    >
                      <View className="flex-row items-center gap-3">
                        <Text className="text-base font-medium text-gray-900 dark:text-white">
                          {broker.broker_name}
                        </Text>
                      </View>
                      <View
                        className={`w-6 h-6 border-2 rounded items-center justify-center ${
                          isSelected
                            ? 'bg-[#4A90E2] border-[#4A90E2]'
                            : 'border-[#ddd] dark:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <Text className="text-white text-base font-bold">
                            ✓
                          </Text>
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
            onPress={onApply}
          >
            <Text className="text-white text-base font-bold">적용</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
