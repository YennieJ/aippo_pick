import { differenceInCalendarDays, startOfDay } from 'date-fns';

export type IpoStatusType = '청약' | '상장' | '환불';

/**
 * 날짜 문자열을 Date 객체로 변환 (YYYY.MM.DD 또는 YYYY-MM-DD)
 * 날짜-only 비교를 위해 로컬 자정(00:00) 기준으로 생성
 */
export function parseYmdToDate(value?: string | null): Date | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  const datePart = raw.split('~')[0].trim();
  const normalized = datePart.replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * 오늘 자정 Date 반환
 */
function getStartOfToday(): Date {
  return startOfDay(new Date());
}

/**
 * D-day 계산 (오늘 자정 기준, 캘린더 day 단위)
 * 양수: 미래, 0: 오늘, 음수: 과거
 */
export function calcDDay(target: Date): number {
  return differenceInCalendarDays(startOfDay(target), getStartOfToday());
}

/**
 * 날짜 문자열로부터 D-day 텍스트 반환
 * @returns "D-N" | "D-Day" | "D+N" | null
 */
export function getDDayText(dateString?: string | null): string | null {
  const date = parseYmdToDate(dateString);
  if (!date) return null;

  const dday = calcDDay(date);

  if (dday > 0) return `D-${dday}`;
  if (dday === 0) return 'D-Day';
  return `D+${Math.abs(dday)}`;
}

/**
 * 날짜 범위("2025.11.17~2025.11.18")에서 적절한 날짜 선택
 * - 시작일이 지나지 않았으면 시작일
 * - 시작일이 지났으면 종료일
 * - 범위가 아니면 그대로 반환
 */
export function pickDateFromRange(dateString?: string | null): string | null {
  if (!dateString) return null;

  const parts = dateString.split('~').map((p) => p.trim());
  if (parts.length < 2) return parts[0] || null;

  const startDate = parseYmdToDate(parts[0]);
  if (startDate && getStartOfToday() >= startDate) return parts[1];
  return parts[0];
}

/**
 * status에 따라 적절한 날짜 문자열 선택
 */
export function getDateByStatus(item: {
  status?: string;
  subscriptiondate?: string | null;
  listingdate?: string | null;
  refunddate?: string | null;
  date?: string | null;
}): string | null {
  switch (item.status) {
    case '청약':
      return pickDateFromRange(item.subscriptiondate || item.date);
    case '상장':
      return item.listingdate || null;
    case '환불':
      return item.refunddate || null;
    default:
      return item.date || null;
  }
}

/**
 * 오늘 이후 가장 가까운 날짜를 기준으로 상태와 날짜 결정
 */
export function getNearestStatusAndDate(
  subscriptiondate?: string | null,
  listingdate?: string | null,
  refunddate?: string | null,
): { status: IpoStatusType; dateString: string; dday: number } | null {
  const entries: {
    status: IpoStatusType;
    dateString: string;
  }[] = [
    // 상세/마이페이지 등에서도 청약 range(시작~종료)를 앱 규칙대로 해석하기 위해 선처리
    { status: '청약', dateString: pickDateFromRange(subscriptiondate) ?? '' },
    { status: '환불', dateString: refunddate ?? '' },
    { status: '상장', dateString: listingdate ?? '' },
  ];

  const candidates: {
    status: IpoStatusType;
    dateString: string;
    dday: number;
  }[] = [];

  for (const entry of entries) {
    if (!entry.dateString) continue;
    const date = parseYmdToDate(entry.dateString);
    if (!date) continue;
    const dday = calcDDay(date);
    if (dday >= 0) {
      candidates.push({ ...entry, dday });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dday - b.dday);
  return candidates[0];
}
