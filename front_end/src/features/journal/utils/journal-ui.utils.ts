import type { JournalRecordListItem } from '../types/journal.types';

const PNL_COLOR_PROFIT = '#c0392b';
const PNL_COLOR_LOSS = '#1a5cb0';
const PNL_COLOR_ZERO = '#1f2937';
const PNL_COLOR_NONE = '#999';

/** 매도가 미입력 시 손익 미계산 */
export function calcPnl(rec: {
  확정공모가: number;
  수량: number;
  매도가: number | null;
  수수료: number;
  제세금: number;
}): { 손익금: number | null; 수익률: number | null } {
  if (rec.매도가 == null) {
    return { 손익금: null, 수익률: null };
  }
  const cost = rec.확정공모가 * rec.수량;
  const sale = rec.매도가 * rec.수량;
  const fees = rec.수수료 + rec.제세금;
  const pnl = sale - cost - fees;
  const pct = cost > 0 ? (pnl / cost) * 100 : null;
  return { 손익금: pnl, 수익률: pct };
}

export function formatKrw(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toLocaleString('ko-KR')}원`;
}

/** 부호 없는 금액 (수수료/제세금 등) */
export function formatKrwUnsigned(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

export function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/** 손익/수익률 합쳐서 `+1,234,000원 (+30.00%)` */
export function formatPnlText(
  손익금: number | null,
  수익률: number | null,
): string {
  if (손익금 == null) {
    return '—';
  }
  if (수익률 == null) {
    return formatKrw(손익금);
  }
  return `${formatKrw(손익금)} (${formatPct(수익률)})`;
}

export function pnlColor(손익금: number | null): string {
  if (손익금 == null) {
    return PNL_COLOR_NONE;
  }
  if (손익금 > 0) {
    return PNL_COLOR_PROFIT;
  }
  if (손익금 < 0) {
    return PNL_COLOR_LOSS;
  }
  return PNL_COLOR_ZERO;
}

function monthFromDate(d: string): number {
  return Number(d.slice(5, 7));
}

export type MonthSection = {
  monthKey: string; // "2025-4"
  month: number;
  /** 월 내 `JournalRecordListItem.손익금`(서버 값) 합 */
  pnlSum: number;
  종목수: number;
  rows: JournalRecordListItem[];
};

export function groupRecordsByMonth(
  rows: JournalRecordListItem[],
  year: number,
): MonthSection[] {
  const buckets = new Map<number, JournalRecordListItem[]>();
  for (const r of rows) {
    const dateStr = r.매도일;
    if (!dateStr) {
      continue;
    }
    const m = monthFromDate(dateStr);
    const list = buckets.get(m) ?? [];
    list.push(r);
    buckets.set(m, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b - a)
    .map(([month, list]) => {
      // 리스트 화면의 손익/합계는 서버 응답 값을 그대로 사용한다.
      const enriched = [...list].sort((a, b) => {
        const da = a.매도일 ?? '';
        const db = b.매도일 ?? '';
        return da < db ? 1 : -1;
      });
      const pnlSum = enriched.reduce((acc, r) => acc + r.손익금, 0);
      return {
        monthKey: `${year}-${month}`,
        month,
        pnlSum,
        종목수: enriched.length,
        rows: enriched,
      };
    });
}

export function parseListingDateToYmd(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const dot = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s);
  if (dot) return `${dot[1]}-${dot[2]}-${dot[3]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return '';
}

/** `YYYY-MM-DD` 문자열을 [하한, 상한]으로 자름(문자열 사전순) */
export function clampYmd(ymd: string, lower?: string, upper?: string): string {
  let out = ymd.slice(0, 10);
  if (lower && out < lower) out = lower;
  if (upper && out > upper) out = upper;
  return out;
}

export function todayYmd(): string {
  // ⚠️ toISOString()은 UTC 기준이라 KST 자정 전후에 날짜가 밀릴 수 있다.
  // 매매일지 기본값은 "한국 시간 오늘"이 되어야 하므로 Asia/Seoul로 고정한다.
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;

    // formatToParts가 없거나 예상치 못한 경우
    const fallback = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    // 혹시 "2026. 05. 01." 같은 형태면 숫자만 뽑아 조립
    const digits = fallback.replace(/[^\d]/g, '');
    if (digits.length >= 8) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    return fallback;
  } catch {
    // Intl/timeZone 미지원 환경 대비: UTC에 +9h 보정
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }
}
