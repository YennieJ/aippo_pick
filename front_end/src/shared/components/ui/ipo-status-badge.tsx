import React from 'react';
import { Text, View } from 'react-native';

export type IpoStatusType = '청약' | '상장' | '환불';

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
 * 날짜 문자열을 Date 객체로 변환 (YYYY.MM.DD 또는 YYYY-MM-DD)
 */
function parseYmdToDate(value?: string | null): Date | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  // 범위 형식("2025.11.17~2025.11.18")일 경우 첫 번째 날짜 사용
  const datePart = raw.split('~')[0].trim();

  const normalized = datePart.replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (!y || !m || !d) return null;

  // 날짜 비교 안정성 위해 정오로 생성
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * D-day 계산 (오늘 기준)
 */
function calcDDay(target: Date): number {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 상태에 따른 색상 반환
 */
function getStatusColor(status: IpoStatusType): string {
  switch (status) {
    case '청약':
      return '#5B9FFF'; // 부드러운 파랑
    case '환불':
      return '#34D399'; // 부드러운 초록
    case '상장':
      return '#F87171'; // 부드러운 빨강
    default:
      return '#666666';
  }
}

/**
 * 오늘 이후 가장 가까운 날짜를 기준으로 상태와 날짜 결정
 */
function getNearestStatusAndDate(
  subscriptiondate?: string | null,
  listingdate?: string | null,
  refunddate?: string | null
): { status: IpoStatusType; dateString: string } | null {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );

  const parseDate = (
    dateStr: string | undefined | null
  ): { date: Date; dday: number } | null => {
    if (!dateStr) return null;
    const datePart = dateStr.split('~')[0].trim().replace(/\./g, '-');
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (!y || !m || !d) return null;
    const targetDate = new Date(y, m - 1, d, 12, 0, 0, 0);
    const diffMs = targetDate.getTime() - today.getTime();
    const dday = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { date: targetDate, dday };
  };

  const dates: Array<{
    status: IpoStatusType;
    dateString: string;
    dday: number;
  }> = [];

  if (subscriptiondate) {
    const parsed = parseDate(subscriptiondate);
    if (parsed && parsed.dday >= 0) {
      dates.push({
        status: '청약',
        dateString: subscriptiondate,
        dday: parsed.dday,
      });
    }
  }
  if (listingdate) {
    const parsed = parseDate(listingdate);
    if (parsed && parsed.dday >= 0) {
      dates.push({
        status: '상장',
        dateString: listingdate,
        dday: parsed.dday,
      });
    }
  }
  if (refunddate) {
    const parsed = parseDate(refunddate);
    if (parsed && parsed.dday >= 0) {
      dates.push({
        status: '환불',
        dateString: refunddate,
        dday: parsed.dday,
      });
    }
  }

  if (dates.length === 0) return null;
  dates.sort((a, b) => a.dday - b.dday);
  return { status: dates[0].status, dateString: dates[0].dateString };
}

/**
 * IPO 상태 뱃지와 디데이 컴포넌트
 * index.tsx의 스타일을 기준으로 만든 공통 컴포넌트
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
  // 자동 상태 결정 모드 (날짜들을 받았을 때)
  let finalStatus: IpoStatusType | null = null;
  let finalDateString: string | null = null;

  if (subscriptiondate || listingdate || refunddate) {
    const result = getNearestStatusAndDate(
      subscriptiondate,
      listingdate,
      refunddate
    );
    if (result) {
      finalStatus = result.status;
      finalDateString = result.dateString;
    }
  } else if (dateString && status) {
    // 직접 지정 모드
    finalStatus = status;
    finalDateString = dateString;
  }

  if (!finalStatus || !finalDateString) {
    return null;
  }

  const targetDate = parseYmdToDate(finalDateString);
  const dday = targetDate ? calcDDay(targetDate) : null;

  // 지난 날짜면 표시하지 않음
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
      {/* 상태 뱃지 */}
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
      {/* 디데이 텍스트 */}
      <Text
        className={`${ddayTextSize} font-bold text-gray-900 dark:text-white`}
      >
        {ddayText}
      </Text>
    </View>
  );
}
