// 이벤트 타입 상수 (데이터 필드명과 일치)
export const EventType = {
  SUBSCRIPTION: 'subscriptiondate',
  REFUND: 'refunddate',
  LISTING: 'listingdate',
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

// 이벤트 메타데이터 (표시용)
export const EventMeta = {
  [EventType.SUBSCRIPTION]: { prefix: '[청]', label: '청약' },
  [EventType.REFUND]: { prefix: '[환]', label: '환불' },
  [EventType.LISTING]: { prefix: '[상]', label: '상장' },
} as const;

// 이벤트 타입별 색상 (부드러운 톤)
export const EVENT_TYPE_COLORS = {
  [EventType.SUBSCRIPTION]: '#5B9FFF', // 부드러운 파랑 (청약)
  [EventType.REFUND]: '#34D399', // 부드러운 초록 (환불)
  [EventType.LISTING]: '#F87171', // 부드러운 빨강 (상장)
} as const;
