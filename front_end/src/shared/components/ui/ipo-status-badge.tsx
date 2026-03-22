import React from 'react';
import { Text, View } from 'react-native';
import {
  calcDDay,
  getNearestStatusAndDate,
  parseYmdToDate,
  type IpoStatusType,
} from '../../utils/dday.utils';

interface IpoStatusBadgeProps {
  /** 날짜 문자열 (YYYY.MM.DD 또는 YYYY-MM-DD 형식, 범위 형식도 지원) - 직접 날짜와 상태를 지정할 때 사용 */
  dateString?: string | null;
  /** 상태 타입 - 직접 날짜와 상태를 지정할 때 사용 */
  status?: IpoStatusType;
  /** 청약일 (자동 상태 결정 시 사용) */
  subscriptiondate?: string | null;
  /** 상장일 (자동 상태 결정 시 사용) */
  listingdate?: string | null;
  /** 환불일 (자동 상태 결정 시 사용) */
  refunddate?: string | null;
  /** 커스텀 클래스명 */
  className?: string;
  /** 크기 (기본값: 'normal', 'small'은 더 작은 크기) */
  size?: 'normal' | 'small';
}

/**
 * 상태에 따른 색상 반환
 */
function getStatusColor(status: IpoStatusType): string {
  switch (status) {
    case '청약':
      return '#5B9FFF';
    case '환불':
      return '#34D399';
    case '상장':
      return '#F87171';
    default:
      return '#666666';
  }
}

/**
 * IPO 상태 뱃지와 디데이 컴포넌트
 *
 * 디데이 표시 규칙:
 * - 오늘 이전 (지난 날짜): 표시 안 함
 * - 오늘: D-Day
 * - 오늘 이후: D-N
 *
 * 사용 방법:
 * 1. 직접 날짜와 상태 지정: <IpoStatusBadge dateString="2025.01.15" status="상장" />
 * 2. 자동 상태 결정: <IpoStatusBadge subscriptiondate="..." listingdate="..." refunddate="..." />
 */
export function IpoStatusBadge({
  dateString,
  status,
  subscriptiondate,
  listingdate,
  refunddate,
  className,
  size = 'normal',
}: IpoStatusBadgeProps) {
  let finalStatus: IpoStatusType | null = null;
  let finalDateString: string | null = null;

  if (subscriptiondate || listingdate || refunddate) {
    const result = getNearestStatusAndDate(
      subscriptiondate,
      listingdate,
      refunddate,
    );
    if (result) {
      finalStatus = result.status;
      finalDateString = result.dateString;
    }
  } else if (dateString && status) {
    finalStatus = status;
    finalDateString = dateString;
  }

  if (!finalStatus || !finalDateString) {
    return null;
  }

  const targetDate = parseYmdToDate(finalDateString);
  const dday = targetDate ? calcDDay(targetDate) : null;

  if (dday === null || dday < 0) {
    return null;
  }

  const statusColor = getStatusColor(finalStatus);
  const ddayText = dday === 0 ? 'D-Day' : `D-${dday}`;

  const isSmall = size === 'small';
  const badgePadding = isSmall ? 'px-2.5 py-0.5' : 'px-4 py-1';
  const badgeTextSize = isSmall ? 'text-xs' : 'text-sm';
  const ddayTextSize = isSmall ? 'text-xs' : 'text-sm';
  const gap = isSmall ? 'gap-1.5' : 'gap-2';

  return (
    <View className={`flex-row items-center ${gap} ${className || ''}`}>
      <View
        className={`${badgePadding} bg-white dark:bg-gray-800 rounded-2xl border-2 items-center justify-center`}
        style={{ borderColor: statusColor }}
      >
        <Text
          className={`${badgeTextSize} font-semibold`}
          style={{ color: statusColor }}
        >
          {finalStatus}
        </Text>
      </View>
      <Text
        className={`${ddayTextSize} font-bold text-gray-900 dark:text-white`}
      >
        {ddayText}
      </Text>
    </View>
  );
}
