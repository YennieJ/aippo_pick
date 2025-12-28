export type NotificationSetting = {
  deviceId: string;
  notifyAll: boolean;
  broker: string;
  spac: boolean;
  reits: boolean;
  alarmTime: string;
};

export type NotificationSettingResponse = {
  deviceId: string;
  notifyAll: boolean;
  broker: string;
  spac: boolean;
  reits: boolean;
  alarmTime: string;
};

export type UpdateNotificationSettingRequest = {
  deviceId: string;
  notifyAll: boolean;
  broker: string;
  spac: boolean;
  reits: boolean;
  alarmTime: string;
};

export type RegisterDeviceRequest = {
  deviceId: string;
  fcmToken: string | null;
  osType: string;
};
