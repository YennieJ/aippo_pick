import WheelPicker from '@quidone/react-native-wheel-picker';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../shared';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';
import { convert12To24, convert24To12 } from '../utils/time.utils';

type Props = {
  visible: boolean;
  /** 현재 알림 시각 ("HH:mm" 24시간) */
  initialTime: string;
  /** 시트 헤더 제목 (편집 대상 알림명) */
  title?: string;
  onClose: () => void;
  /** "완료" 시 24시간 문자열 반환 */
  onConfirm: (time24: string) => void;
};

/**
 * 알림 시각 선택 바텀시트 (오늘의 공모주 / AI 리포트 / 이번 주 요약 공통).
 */
export function TimePickerSheet({
  visible,
  initialTime,
  title = '알림 시각',
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9CA3AF' : '#666';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#333333';

  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

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

  // 열릴 때 현재 시각으로 휠 위치 초기화
  useEffect(() => {
    if (visible) {
      const t = convert24To12(initialTime);
      setPeriod(t.period);
      setHour(t.hour);
      setMinute(t.minute);
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    onConfirm(convert12To24(period, hour, minute));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-800 rounded-t-[20px]">
          <View className="flex-row justify-between items-center p-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <IconSymbol name="xmark" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <View
            className="flex-row items-center justify-center"
            style={{ height: 180 }}
          >
            <WheelPicker
              data={periodData}
              value={period}
              onValueChanged={({ item: { value } }) => setPeriod(value)}
              itemHeight={40}
              width={70}
              itemTextStyle={{ fontSize: 18, fontWeight: '600', color: textColor }}
            />
            <WheelPicker
              data={hourData}
              value={hour}
              onValueChanged={({ item: { value } }) => setHour(value)}
              itemHeight={40}
              width={60}
              itemTextStyle={{ fontSize: 20, fontWeight: '700', color: textColor }}
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
              onValueChanged={({ item: { value } }) => setMinute(value)}
              itemHeight={40}
              width={60}
              itemTextStyle={{ fontSize: 20, fontWeight: '700', color: textColor }}
            />
          </View>

          <TouchableOpacity
            className="mx-5 mt-4 py-3.5 bg-[#4A90E2] rounded-lg items-center"
            style={{ marginBottom: insets.bottom + 16 }}
            onPress={handleConfirm}
          >
            <Text className="text-white text-base font-bold">완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
