import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';
import { EventType } from '../constants/event.constants';
import { getCumulativeWidth, getDayWidth } from '../utils/calendar.utils';
import { getTextColorForBackground } from '../utils/color.utils';

// 이벤트 타입별 뱃지 색상 (부드러운 톤)
const BADGE_COLORS = {
  [EventType.SUBSCRIPTION]: '#5B9FFF', // 부드러운 파랑 (청약)
  [EventType.REFUND]: '#34D399', // 부드러운 초록 (환불)
  [EventType.LISTING]: '#F87171', // 부드러운 빨강 (상장)
};

interface CalendarWeekProps {
  week: Array<{ day: number; isCurrentMonth: boolean } | null>;
  events: any[];
  todayYear: number;
  todayMonth: number;
  todayDay: number;
  todayDayOfWeek: number;
  currentYear: number;
  currentMonth: number;
  isLastWeek?: boolean;
}

export default function CalendarWeek({
  week,
  events,
  todayYear,
  todayMonth,
  todayDay,
  todayDayOfWeek,
  currentYear,
  currentMonth,
  isLastWeek = false,
}: CalendarWeekProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const maxRow = events.length > 0 ? Math.max(...events.map((e) => e.row)) : 0;
  const eventSpacing = 28;
  const weekHeight = Math.max(70, 50 + (maxRow + 1) * eventSpacing);

  const isToday = (day: number | null) => {
    if (!day) return false;
    return (
      day === todayDay &&
      currentMonth === todayMonth &&
      currentYear === todayYear
    );
  };

  // 이 주에 토요일/일요일에 해당하는 선을 표시할지 확인
  const shouldShowWeekendLine = () => {
    if (todayDayOfWeek === 6) {
      // 토요일: 금요일(어제)이 이 주의 마지막 날인지 확인
      const yesterday = new Date(todayYear, todayMonth - 1, todayDay - 1);
      const fridayInWeek = week[4]; // 금요일
      return (
        fridayInWeek &&
        fridayInWeek.day === yesterday.getDate() &&
        yesterday.getMonth() === currentMonth - 1 &&
        yesterday.getFullYear() === currentYear
      );
    } else if (todayDayOfWeek === 0) {
      // 일요일: 월요일(내일)이 이 주의 첫 날인지 확인
      const tomorrow = new Date(todayYear, todayMonth - 1, todayDay + 1);
      const mondayInWeek = week[0]; // 월요일
      return (
        mondayInWeek &&
        mondayInWeek.day === tomorrow.getDate() &&
        tomorrow.getMonth() === currentMonth - 1 &&
        tomorrow.getFullYear() === currentYear
      );
    }
    return false;
  };

  const showLine = shouldShowWeekendLine();

  return (
    <View
      style={[
        styles.weekRow,
        {
          minHeight: weekHeight,
          ...(isLastWeek
            ? {}
            : {
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#333' : '#f0f0f0',
              }),
        },
      ]}
    >
      {/* 날짜 셀 */}
      <View className="flex-row">
        {week.map((dayObj, dayIndex) => {
          return (
            <View
              key={dayIndex}
              className="p-2 justify-start items-center relative"
              style={[
                {
                  width: `${getDayWidth(dayIndex)}%`,
                  minHeight: weekHeight,
                },
                dayObj &&
                  dayObj.isCurrentMonth &&
                  isToday(dayObj.day) && {
                    borderWidth: 2,
                    borderColor: '#FF9500',
                    borderRadius: 8,
                  },
              ]}
            >
              {/* 일요일일 때 월요일(dayIndex 0) 왼쪽에 선 */}
              {showLine && todayDayOfWeek === 0 && dayIndex === 0 && (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#FF9500',
                  }}
                />
              )}
              {/* 토요일일 때 금요일(dayIndex 4) 오른쪽에 선 */}
              {showLine && todayDayOfWeek === 6 && dayIndex === 4 && (
                <View
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#FF9500',
                  }}
                />
              )}
              {dayObj && (
                <View className="self-center items-center justify-center w-full pt-0.5 min-h-[20px] relative">
                  <Text
                    className="text-sm font-medium"
                    style={[
                      !dayObj.isCurrentMonth && {
                        color: isDark ? '#666' : '#ccc',
                        fontWeight: '400',
                      },
                      !dayObj.isCurrentMonth &&
                        !isToday(dayObj.day) && {
                          color: isDark ? '#666' : '#ccc',
                        },
                      dayObj.isCurrentMonth &&
                        !isToday(dayObj.day) && {
                          color: isDark ? '#fff' : '#000',
                        },
                      dayObj.isCurrentMonth &&
                        isToday(dayObj.day) && {
                          color: '#FF9500',
                          fontWeight: 'bold',
                        },
                    ]}
                  >
                    {dayObj.day}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 이벤트 레이어 */}
      <View style={styles.eventsLayer}>
        {events.map((segment) => {
          if (segment.startCol === -1 || segment.span === 0) return null;

          const eventLeft = getCumulativeWidth(segment.startCol);

          let eventWidth = 0;
          for (
            let i = segment.startCol;
            i < segment.startCol + segment.span;
            i++
          ) {
            eventWidth += getDayWidth(i);
          }

          const textColor = getTextColorForBackground(segment.color);

          // 타이틀에서 prefix와 회사명 분리
          // "[청] 회사명" → prefix: "청", company: "회사명"
          const titleMatch = segment.title.match(/^\[(.)\]\s*(.+)$/);
          const badgeText = titleMatch ? titleMatch[1] : '';
          const companyName = titleMatch ? titleMatch[2] : segment.title;
          const badgeColor =
            BADGE_COLORS[segment.type as keyof typeof BADGE_COLORS] ||
            '#666666';

          // segment.id는 `${code_id}-${eventType}` 형식
          const codeId = segment.id.split('-')[0];

          const handleEventPress = () => {
            if (codeId) {
              router.push(`/ipo/${codeId}`);
            }
          };

          return (
            <TouchableOpacity
              key={segment.segmentId}
              style={[
                styles.eventBar,
                {
                  left: `${eventLeft}%`,
                  width: `${eventWidth - 0.5}%`,
                  top: segment.row * 28,
                },
              ]}
              onPress={handleEventPress}
              activeOpacity={0.7}
            >
              <View
                className="flex-row items-center h-full"
                style={{ gap: 2, paddingLeft: 4 }}
              >
                {badgeText && (
                  <View
                    className="w-[18px] h-[18px] rounded-full border-[1.5px] justify-center items-center"
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      borderColor: badgeColor,
                    }}
                  >
                    <Text
                      className="text-[9px] font-bold"
                      style={{ color: badgeColor }}
                    >
                      {badgeText}
                    </Text>
                  </View>
                )}
                <View
                  className="flex-1 h-full rounded-sm px-1 py-0.5 justify-center"
                  style={{ backgroundColor: segment.color }}
                >
                  <Text
                    className="text-[10px] font-medium"
                    style={{ color: textColor }}
                    numberOfLines={1}
                  >
                    {companyName}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    minHeight: 70,
    position: 'relative',
    paddingHorizontal: 16,
  },
  eventsLayer: {
    position: 'absolute',
    top: 35,
    left: 16,
    right: 16,
    paddingHorizontal: 2,
  },
  eventBar: {
    position: 'absolute',
    height: 24,
    marginBottom: 4,
  },
});
