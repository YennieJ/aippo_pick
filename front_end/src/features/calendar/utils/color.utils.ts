// HSL을 RGB로 변환
const hslToRgb = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// code_id를 해시하여 색상 생성 (동적)
export const getColorFromCodeId = (codeId: string): string => {
  // code_id를 해시값으로 변환
  let hash = 0;
  for (let i = 0; i < codeId.length; i++) {
    hash = codeId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // 32bit 정수로 변환
  }

  // Golden Ratio를 사용하여 색조 계산
  const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
  const hue = (Math.abs(hash) * GOLDEN_RATIO_CONJUGATE * 360) % 360;

  // 해시값을 이용해 채도와 밝기도 변화
  const hash2 = Math.abs(hash >> 8);
  const hash3 = Math.abs(hash >> 16);

  // 채도: 50% ~ 75% 범위
  const saturation = 50 + (hash2 % 26); // 50-75

  // 밝기: 65% ~ 85% 범위
  const lightness = 65 + (hash3 % 21); // 65-85

  return hslToRgb(hue, saturation, lightness);
};

// 배경색의 밝기를 계산하여 적절한 텍스트 색상 반환
export const getTextColorForBackground = (backgroundColor: string): string => {
  // hex를 RGB로 변환
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 상대 휘도 계산 (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // 밝은 배경이면 검은색, 어두운 배경이면 흰색
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
