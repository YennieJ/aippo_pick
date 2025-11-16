import { StyleSheet, Text, View } from 'react-native';
import { EventType } from '../../constants/ipo.constants';
import { getCumulativeWidth, getDayWidth } from '../../utils/calendar.utils';
import { getTextColorForBackground } from '../../utils/color.utils';

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
  currentYear: number;
  currentMonth: number;
}

export default function CalendarWeek({
  week,
  events,
  todayYear,
  todayMonth,
  todayDay,
  currentYear,
  currentMonth,
}: CalendarWeekProps) {
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

  return (
    <View
      style={[
        styles.weekRow,
        {
          minHeight: weekHeight,
        },
      ]}
    >
      {/* 날짜 셀 */}
      <View style={styles.daysRow}>
        {week.map((dayObj, dayIndex) => (
          <View
            key={dayIndex}
            style={[
              styles.dayCell,
              {
                width: `${getDayWidth(dayIndex)}%`,
                minHeight: weekHeight,
              },
            ]}
          >
            {dayObj && (
              <>
                {/* 원형 배경 (오늘 날짜만) */}
                {dayObj.isCurrentMonth && isToday(dayObj.day) && (
                  <View style={styles.todayContainer} />
                )}
                <View style={styles.dayNumberContainer}>
                  <Text
                    style={[
                      styles.dayNumber,
                      !dayObj.isCurrentMonth && styles.otherMonthNumber,
                      dayObj.isCurrentMonth &&
                        isToday(dayObj.day) &&
                        styles.todayNumber,
                    ]}
                  >
                    {dayObj.day}
                  </Text>
                </View>
              </>
            )}
          </View>
        ))}
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

          return (
            <View
              key={segment.segmentId}
              style={[
                styles.eventBar,
                {
                  left: `${eventLeft}%`,
                  width: `${eventWidth - 0.5}%`,
                  top: segment.row * 28,
                },
              ]}
            >
              <View style={styles.eventContent}>
                {badgeText && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: '#fff',
                        borderColor: badgeColor,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: badgeColor }]}>
                      {badgeText}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.companyNameContainer,
                    { backgroundColor: segment.color },
                  ]}
                >
                  <Text
                    style={[styles.eventText, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {companyName}
                  </Text>
                </View>
              </View>
            </View>
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
  daysRow: {
    flexDirection: 'row',
  },
  dayCell: {
    padding: 8,
    minHeight: 70,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dayNumberContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 2,
    minHeight: 20,
    position: 'relative',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  otherMonthNumber: {
    color: '#ccc',
    fontWeight: '400',
  },
  todayContainer: {
    backgroundColor: '#666666',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 10,
  },
  todayNumber: {
    color: '#fff',
    fontWeight: 'bold',
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
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: '100%',
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  companyNameContainer: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  eventText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
