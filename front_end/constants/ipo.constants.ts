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
