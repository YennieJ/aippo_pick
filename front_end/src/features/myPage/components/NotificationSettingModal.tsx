import WheelPicker from '@quidone/react-native-wheel-picker';
import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../shared';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';
import { convert12To24, convert24To12 } from '../utils/time.utils';

interface NotificationSettingModalProps {
  visible: boolean;
  onClose: () => void;
  allBrokers: any[];
  // 임시 상태 (모달 내에서만 사용)
  tempNotifySpac: boolean;
  tempNotifyReits: boolean;
  tempAlarmTime: string;
  tempSelectedBrokers: string[];
  // 핸들러
  onToggleSpac: () => void;
  onToggleReits: () => void;
  onAlarmTimeChange: (time: string) => void;
  onToggleBroker: (brokerName: string) => void;
  onResetToAll: () => void;
  onApply: () => void;
}

export default function NotificationSettingModal({
  visible,
  onClose,
  allBrokers,
  tempNotifySpac,
  tempNotifyReits,
  tempAlarmTime,
  tempSelectedBrokers,
  onToggleSpac,
  onToggleReits,
  onAlarmTimeChange,
  onToggleBroker,
  onResetToAll,
  onApply,
}: NotificationSettingModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9CA3AF' : '#666';

  const isDark = colorScheme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#333333';

  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  // 휠 피커 데이터
  const periodData = useMemo(
    () => [
      { value: 'AM' as const, label: '오전' },
      { value: 'PM' as const, label: '오후' },
    ],
    [],
  );

  const hourData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
    [],
  );

  const minuteData = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, '0'),
      })),
    [],
  );

  useEffect(() => {
    if (visible) {
      const time12 = convert24To12(tempAlarmTime);
      setPeriod(time12.period);
      setHour(time12.hour);
      setMinute(time12.minute);
    }
  }, [visible, tempAlarmTime]);

  const updateTime = (p: 'AM' | 'PM', h: number, m: number) => {
    const time24 = convert12To24(p, h, m);
    onAlarmTimeChange(time24);
  };

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
        <View className="bg-white dark:bg-gray-800 rounded-t-[20px] max-h-[90%] min-h-[70%] flex-col">
          <View className="flex-row justify-between items-center p-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              알림 설정
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <IconSymbol name="xmark" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 min-h-0"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* 알림 종목 */}
            <View className="px-5 pt-2 pb-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
              <Text className="text-base font-semibold text-[#333] dark:text-white mb-3">
                알림 종목
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={onToggleSpac}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      tempNotifySpac
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {tempNotifySpac && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    SPAC 알림
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={onToggleReits}
                >
                  <View
                    className={`w-5 h-5 border-2 rounded items-center justify-center ${
                      tempNotifyReits
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    {tempNotifyReits && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text className="text-sm text-[#333] dark:text-white font-medium">
                    REITS 알림
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 알림 시간 */}
            <View className="px-5 pt-4 pb-4 border-b border-b-[#f0f0f0] dark:border-b-gray-700">
              <Text className="text-base font-semibold text-[#333] dark:text-white mb-1">
                알림 시간
              </Text>
              <View
                className="flex-row items-center justify-center"
                style={{ height: 150 }}
              >
                <WheelPicker
                  data={periodData}
                  value={period}
                  onValueChanged={({ item: { value } }) => {
                    setPeriod(value);
                    updateTime(value, hour, minute);
                  }}
                  itemHeight={40}
                  width={70}
                  itemTextStyle={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: textColor,
                  }}
                />
                <WheelPicker
                  data={hourData}
                  value={hour}
                  onValueChanged={({ item: { value } }) => {
                    setHour(value);
                    updateTime(period, value, minute);
                  }}
                  itemHeight={40}
                  width={60}
                  itemTextStyle={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: textColor,
                  }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: textColor,
                    marginHorizontal: 2,
                  }}
                >
                  :
                </Text>
                <WheelPicker
                  data={minuteData}
                  value={minute}
                  onValueChanged={({ item: { value } }) => {
                    setMinute(value);
                    updateTime(period, hour, value);
                  }}
                  itemHeight={40}
                  width={60}
                  itemTextStyle={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: textColor,
                  }}
                />
              </View>
            </View>

            {/* 증권사 필터 */}
            <View className="px-5 pt-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-semibold text-[#333] dark:text-white">
                  증권사 알림
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
                    broker.broker_name,
                  );
                  return (
                    <TouchableOpacity
                      key={broker.broker_id}
                      className="flex-row justify-between items-center px-2 py-3"
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
            onPress={onApply}
          >
            <Text className="text-white text-base font-bold">적용</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
