import { useMemo } from 'react';
import {
  EventMeta,
  EventType,
  EventTypeValue,
} from '../constants/ipo.constants';
import { formatDate, isWeekend } from '../utils/calendar.utils';
import { getColorFromCodeId } from '../utils/color.utils';

// 선택된 타입에 따라 이벤트 생성
export const getEventsFromIPO = (
  ipoData: any[],
  selectedTypes: Set<EventTypeValue>
) => {
  const events: any[] = [];
  const showAll = selectedTypes.size === 0;

  ipoData.forEach((ipo) => {
    Object.values(EventType).forEach((eventType) => {
      if (showAll || selectedTypes.has(eventType)) {
        const dateValue = ipo[eventType as keyof typeof ipo] as string;
        const meta = EventMeta[eventType];

        let startDate: string;
        let endDate: string;

        if (dateValue.includes('~')) {
          [startDate, endDate] = dateValue.split('~').map((d) => d.trim());
        } else {
          startDate = endDate = dateValue;
        }

        events.push({
          id: `${ipo.code_id}-${eventType}`,
          title: `${meta.prefix} ${ipo.company}`,
          startDate,
          endDate,
          color: getColorFromCodeId(ipo.code_id),
          type: eventType,
        });
      }
    });
  });

  return events;
};

// 특정 주에서 이벤트를 세그먼트로 분할 (주말 제외)
const getEventSegments = (
  event: any,
  weekDays: Array<{ day: number; isCurrentMonth: boolean } | null>,
  year: number,
  month: number
) => {
  const segments: Array<{ startCol: number; span: number }> = [];
  let currentSegment: { startCol: number; span: number } | null = null;

  weekDays.forEach((dayObj, index) => {
    if (isWeekend(index)) {
      if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = null;
      }
      return;
    }

    if (dayObj) {
      if (!dayObj.isCurrentMonth) {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = null;
        }
        return;
      }

      const dateStr = formatDate(year, month, dayObj.day);

      if (dateStr >= event.startDate && dateStr <= event.endDate) {
        if (currentSegment === null) {
          currentSegment = { startCol: index, span: 1 };
        } else {
          currentSegment.span++;
        }
      } else if (currentSegment) {
        segments.push(currentSegment);
        currentSegment = null;
      }
    }
  });

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
};

// 주에 해당하는 이벤트 세그먼트 찾기 (주 단위로 row 할당)
export const getEventsForWeek = (
  weekDays: Array<{ day: number; isCurrentMonth: boolean } | null>,
  year: number,
  month: number,
  ipoData: any[],
  selectedTypes: Set<EventTypeValue>
) => {
  const allSegments: Array<any> = [];
  const events = getEventsFromIPO(ipoData, selectedTypes);

  events.forEach((event) => {
    const hasEventInWeek = weekDays.some((dayObj) => {
      if (!dayObj || !dayObj.isCurrentMonth) return false;
      const dateStr = formatDate(year, month, dayObj.day);
      return dateStr >= event.startDate && dateStr <= event.endDate;
    });

    if (hasEventInWeek) {
      const segments = getEventSegments(event, weekDays, year, month);
      segments.forEach((segment) => {
        allSegments.push({
          ...event,
          startCol: segment.startCol,
          span: segment.span,
          segmentId: `${event.id}-${segment.startCol}`,
        });
      });
    }
  });

  // 이 주에서 code_id별로 세그먼트 그룹화
  const segmentsByCodeId = new Map<string, Array<any>>();
  allSegments.forEach((segment) => {
    const codeId = segment.id.split('-')[0];
    if (!segmentsByCodeId.has(codeId)) {
      segmentsByCodeId.set(codeId, []);
    }
    segmentsByCodeId.get(codeId)!.push(segment);
  });

  // 이 주에서 각 code_id 그룹에 row 할당
  const segmentsWithRows: Array<any> = [];

  segmentsByCodeId.forEach((segments, codeId) => {
    let row = 0;
    let hasOverlap = true;

    // 이 회사의 모든 세그먼트가 기존 row와 겹치지 않는지 확인
    while (hasOverlap) {
      hasOverlap = segments.some((segment) => {
        return segmentsWithRows.some((s) => {
          if (s.row !== row) return false;
          const segmentEnd = segment.startCol + segment.span - 1;
          const sEnd = s.startCol + s.span - 1;
          return !(segmentEnd < s.startCol || segment.startCol > sEnd);
        });
      });

      if (hasOverlap) {
        row++;
      }
    }

    // 이 회사의 모든 세그먼트에 같은 row 할당
    segments.forEach((segment) => {
      segmentsWithRows.push({ ...segment, row });
    });
  });

  return segmentsWithRows;
};

// Custom Hook
export const useCalendarEvents = (
  weekDays: Array<{ day: number; isCurrentMonth: boolean } | null>,
  year: number,
  month: number,
  ipoData: any[],
  selectedTypes: Set<EventTypeValue>
) => {
  return useMemo(
    () => getEventsForWeek(weekDays, year, month, ipoData, selectedTypes),
    [weekDays, year, month, ipoData, selectedTypes]
  );
};
