import { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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

  // 24시간 형식을 12시간 형식으로 변환
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour, setHour] = useState<string>('8');
  const [minute, setMinute] = useState<string>('00');

  // 모달이 열릴 때마다 현재 시간으로 초기화
  useEffect(() => {
    if (visible) {
      const time12 = convert24To12(tempAlarmTime);
      setPeriod(time12.period);
      setHour(time12.hour.toString());
      setMinute(time12.minute.toString().padStart(2, '0'));
    }
  }, [visible, tempAlarmTime]);

  // 시간 입력 핸들러
  const handleHourChange = (text: string) => {
    // 숫자만 허용
    const numText = text.replace(/[^0-9]/g, '');
    if (numText === '') {
      setHour('');
      return;
    }
    const num = parseInt(numText, 10);
    // 1-12 범위만 허용
    if (num >= 1 && num <= 12) {
      setHour(numText);
      const paddedMinute = minute || '00';
      updateTime(period, numText, paddedMinute);
    } else if (num === 0) {
      // 0은 허용하지 않음
      return;
    }
  };

  const handleMinuteChange = (text: string) => {
    // 숫자만 허용
    const numText = text.replace(/[^0-9]/g, '');
    if (numText === '') {
      setMinute('');
      return;
    }
    const num = parseInt(numText, 10);
    // 0-59 범위만 허용
    if (num >= 0 && num <= 59) {
      // 2자리로 패딩
      const padded = numText.length === 1 ? numText.padStart(2, '0') : numText;
      setMinute(padded);
      const currentHour = hour || '8';
      updateTime(period, currentHour, padded);
    }
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod);
    updateTime(newPeriod, hour, minute);
  };

  const updateTime = (
    newPeriod: 'AM' | 'PM',
    newHour: string,
    newMinute: string
  ) => {
    if (newHour && newMinute) {
      const hourNum = parseInt(newHour, 10);
      const minuteNum = parseInt(newMinute, 10);
      if (hourNum >= 1 && hourNum <= 12 && minuteNum >= 0 && minuteNum <= 59) {
        const time24 = convert12To24(newPeriod, hourNum, minuteNum);
        onAlarmTimeChange(time24);
      }
    }
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
        <View className="bg-white dark:bg-gray-800 rounded-t-[20px] max-h-[85%] min-h-[500px] flex-col">
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
              <Text className="text-base font-semibold text-[#333] dark:text-white mb-3">
                알림 시간
              </Text>
              <View className="flex-row items-center gap-3">
                {/* 오전/오후 선택 */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handlePeriodChange('AM')}
                    className={`px-4 py-2.5 rounded-lg border-2 ${
                      period === 'AM'
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'bg-white dark:bg-gray-700 border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        period === 'AM'
                          ? 'text-white'
                          : 'text-[#333] dark:text-white'
                      }`}
                    >
                      오전
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePeriodChange('PM')}
                    className={`px-4 py-2.5 rounded-lg border-2 ${
                      period === 'PM'
                        ? 'bg-[#4A90E2] border-[#4A90E2]'
                        : 'bg-white dark:bg-gray-700 border-[#ddd] dark:border-gray-600'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        period === 'PM'
                          ? 'text-white'
                          : 'text-[#333] dark:text-white'
                      }`}
                    >
                      오후
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 시간 입력 */}
                <View className="flex-row items-center gap-2 flex-1">
                  <TextInput
                    value={hour}
                    onChangeText={handleHourChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    className="flex-1 bg-white dark:bg-gray-700 border border-[#ddd] dark:border-gray-600 rounded-lg px-3 py-2.5 text-center text-base font-semibold text-[#333] dark:text-white"
                    placeholder="12"
                    placeholderTextColor={
                      colorScheme === 'dark' ? '#9CA3AF' : '#999'
                    }
                  />
                  <Text className="text-lg font-bold text-[#333] dark:text-white">
                    :
                  </Text>
                  <TextInput
                    value={minute}
                    onChangeText={handleMinuteChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    className="flex-1 bg-white dark:bg-gray-700 border border-[#ddd] dark:border-gray-600 rounded-lg px-3 py-2.5 text-center text-base font-semibold text-[#333] dark:text-white"
                    placeholder="00"
                    placeholderTextColor={
                      colorScheme === 'dark' ? '#9CA3AF' : '#999'
                    }
                  />
                </View>
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
                    broker.broker_name
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
