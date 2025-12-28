import { useRouter } from 'expo-router';
import {
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../shared';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';
import { EventType } from '../constants/event.constants';
import { getTextColorForBackground } from '../utils/color.utils';

// 이벤트 타입별 뱃지 색상
const BADGE_COLORS = {
  [EventType.SUBSCRIPTION]: '#5B9FFF',
  [EventType.REFUND]: '#34D399',
  [EventType.LISTING]: '#F87171',
};

interface CalendarDayEventsModalProps {
  visible: boolean;
  onClose: () => void;
  date: string; // "2024.01.15" 형식
  events: Array<{
    id: string;
    title: string;
    type: string;
    color: string;
  }>;
}

export default function CalendarDayEventsModal({
  visible,
  onClose,
  date,
  events,
}: CalendarDayEventsModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#9CA3AF' : '#666';
  const screenHeight = Dimensions.get('window').height;
  const modalMaxHeight = screenHeight * 0.8;
  const headerHeight = 80; // 헤더 높이 추정
  const scrollViewHeight = modalMaxHeight - headerHeight;

  // 날짜 포맷팅 (2024.01.15 -> 2024년 1월 15일)
  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('.');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  };

  const handleEventPress = (event: { id: string }) => {
    const codeId = event.id.split('-')[0];
    if (codeId) {
      router.push(`/ipo/${codeId}`);
      onClose();
    }
  };

  // 타이틀에서 prefix와 회사명 분리
  const parseEventTitle = (title: string) => {
    const titleMatch = title.match(/^\[(.)\]\s*(.+)$/);
    const badgeText = titleMatch ? titleMatch[1] : '';
    const companyName = titleMatch ? titleMatch[2] : title;
    return { badgeText, companyName };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl"
          style={{ maxHeight: modalMaxHeight }}
        >
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDisplayDate(date)}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {events.length}개의 이벤트
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <IconSymbol name="xmark" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ height: scrollViewHeight }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {events.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Text className="text-base text-gray-500 dark:text-gray-400">
                  이 날짜에는 이벤트가 없습니다
                </Text>
              </View>
            ) : (
              events.map((event, index) => {
                const { badgeText, companyName } = parseEventTitle(event.title);
                const badgeColor =
                  BADGE_COLORS[event.type as keyof typeof BADGE_COLORS] ||
                  '#666666';
                const textColor = getTextColorForBackground(event.color);

                return (
                  <TouchableOpacity
                    key={`${event.id}-${index}`}
                    onPress={() => handleEventPress(event)}
                    activeOpacity={0.7}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <View className="flex-row items-center gap-3">
                      {badgeText && (
                        <View
                          className="w-[24px] h-[24px] rounded-full border-2 justify-center items-center"
                          style={{
                            backgroundColor: isDark ? '#1a1a1a' : '#fff',
                            borderColor: badgeColor,
                          }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: badgeColor }}
                          >
                            {badgeText}
                          </Text>
                        </View>
                      )}
                      <View
                        className="flex-1 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: event.color }}
                      >
                        <Text
                          className="text-base font-semibold"
                          style={{ color: textColor }}
                        >
                          {companyName}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
