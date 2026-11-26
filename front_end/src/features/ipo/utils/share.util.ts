import { Share } from 'react-native';
import { IpoDetailData } from '../types/ipo.types';

/**
 * 공유 스마트 링크가 착지하는 리다이렉트 페이지 도메인.
 * 기존 API 서버의 GET /s/ipo/<codeId> 가 앱/스토어로 분기 리다이렉트한다.
 * 설치 시 앱(frontend://ipo/<codeId>), 미설치 시 스토어.
 * ⚠️ 배포 전 로컬 테스트용 임시 ngrok 주소. 배포 시 'https://api.aippopick.shop' 로 원복.
 */
export const SHARE_BASE_URL = 'https://valium-curfew-floss.ngrok-free.dev';

/**
 * 특정 공모주 상세로 연결되는 공유용 스마트 링크 생성.
 */
export const buildIpoShareUrl = (codeId: string): string =>
  `${SHARE_BASE_URL}/s/ipo/${encodeURIComponent(codeId)}`;

/** 가격 문자열에 '원'이 없으면 붙여준다. 값이 없으면 undefined. */
const withWon = (price?: string): string | undefined => {
  if (!price) return undefined;
  const trimmed = price.trim();
  if (!trimmed || trimmed === '-' || trimmed === '-원') return undefined;
  return trimmed.includes('원') ? trimmed : `${trimmed}원`;
};

/** '2026.08.12~2026.08.13' → '8.12~8.13' (범위/단일 모두 지원) */
const shortDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const fmt = (d: string) => {
    const m = d.trim().replace(/\./g, '-').match(/^\d{4}-(\d{2})-(\d{2})$/);
    return m ? `${Number(m[1])}.${Number(m[2])}` : d.trim();
  };
  const parts = value.split('~').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  return parts.length === 1 ? fmt(parts[0]) : `${fmt(parts[0])}~${fmt(parts[1])}`;
};

/**
 * 공유 메시지 생성 — 정보를 텍스트에 모두 담아, 문자·카톡 등 어디서든
 * 별도 카드 렌더링 없이 바로 보이게 한다.
 * @param score AI 종합점수 (0~100). 있으면 함께 표기.
 */
export const buildIpoShareMessage = (
  ipo: IpoDetailData,
  score?: number,
): string => {
  const lines: string[] = [];
  lines.push(`📈 ${ipo.company} 공모주 정보`);
  lines.push('');

  // 공모가 (확정 우선, 없으면 희망)
  const confirmed = withWon(ipo.confirmedprice);
  const price = confirmed ?? withWon(ipo.desiredprice);
  if (price) lines.push(`${confirmed ? '확정' : '희망'} 공모가  ${price}`);

  // 경쟁률 (청약 우선, 없으면 기관)
  const competition =
    (ipo.competitionrate && ipo.competitionrate.trim()) ||
    (ipo.institutional_competition_rate &&
      ipo.institutional_competition_rate.trim());
  if (competition) {
    const label = ipo.competitionrate?.trim() ? '청약 경쟁률' : '기관 경쟁률';
    lines.push(`${label}  ${competition}`);
  }

  // AI 종합점수
  if (typeof score === 'number' && Number.isFinite(score) && score > 0) {
    lines.push(`AI 종합점수  ${Math.round(score)}점`);
  }

  // 일정 (청약 / 환불 / 상장)
  const schedule = [
    { label: '청약', value: shortDate(ipo.subscriptiondate) },
    { label: '환불', value: shortDate(ipo.refunddate) },
    { label: '상장', value: shortDate(ipo.listingdate) },
  ].filter((s) => s.value);
  if (schedule.length) {
    lines.push('');
    for (const s of schedule) lines.push(`📅 ${s.label}  ${s.value}`);
  }

  lines.push('');
  lines.push('자세히 보기 👇');
  lines.push(buildIpoShareUrl(ipo.code_id));

  return lines.join('\n');
};

/**
 * OS 공유 시트로 공모주를 공유한다. (iOS/Android 공통, RN 내장 Share 사용)
 * @param score AI 종합점수 (선택)
 */
export const shareIpo = async (
  ipo: IpoDetailData,
  score?: number,
): Promise<void> => {
  try {
    await Share.share({
      title: `${ipo.company} 공모주 정보`,
      message: buildIpoShareMessage(ipo, score),
    });
  } catch {
    // 사용자가 공유 시트를 닫는 경우 등 — 조용히 무시
  }
};
