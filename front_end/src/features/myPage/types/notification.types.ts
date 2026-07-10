export type NotificationSetting = {
  deviceId: string;
  notifyAll: boolean;
  broker: string;
  spac: boolean;
  reits: boolean;
  // 알람 시각 (설정 가능한 3종)
  morningAlarmTime: string; // 오늘의 공모주 (평일)
  aiReportAlarmTime: string; // AI 리포트 (매일)
  weeklyAlarmTime: string; // 이번 주 요약 (월요일)
  // 알림 종류별 On/Off (기본값 true)
  notifyMorning: boolean;
  notifySubStart: boolean;
  notifySubEnd: boolean;
  notifyAiReport: boolean;
  notifyWeekly: boolean;
};

export type NotificationSettingResponse = {
  deviceId: string;
  notifyAll: boolean;
  broker: string;
  spac: boolean;
  reits: boolean;
  morningAlarmTime: string;
  aiReportAlarmTime: string;
  weeklyAlarmTime: string;
  notifyMorning: boolean;
  notifySubStart: boolean;
  notifySubEnd: boolean;
  notifyAiReport: boolean;
  notifyWeekly: boolean;
};

// PUT은 바뀐 필드만 보내면 나머지는 서버가 유지 → deviceId 외 전부 optional
export type UpdateNotificationSettingRequest = {
  deviceId: string;
  notifyAll?: boolean;
  broker?: string;
  spac?: boolean;
  reits?: boolean;
  morningAlarmTime?: string;
  aiReportAlarmTime?: string;
  weeklyAlarmTime?: string;
  notifyMorning?: boolean;
  notifySubStart?: boolean;
  notifySubEnd?: boolean;
  notifyAiReport?: boolean;
  notifyWeekly?: boolean;
};

export type RegisterDeviceRequest = {
  deviceId: string;
  fcmToken: string | null;
  osType: string;
};
