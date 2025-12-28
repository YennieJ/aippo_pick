import { api } from '../../../shared/api/client';
import {
  NotificationSettingResponse,
  RegisterDeviceRequest,
  UpdateNotificationSettingRequest,
} from '../types/notification.types';

/**
 * 디바이스 등록/업데이트
 * @param data 디바이스 정보
 */
export const registerDevice = async (
  data: RegisterDeviceRequest
): Promise<void> => {
  await api.post('/user_device', data);
};

/**
 * 알림 설정 조회
 * @param deviceId 디바이스 ID
 */
export const getNotificationSetting = async (
  deviceId: string
): Promise<NotificationSettingResponse | null> => {
  try {
    const response = await api.get<NotificationSettingResponse>(
      `/notification_setting/${deviceId}`
    );
    return response.data;
  } catch (error) {
    console.log('알림 설정 로딩 실패:', error);
    return null;
  }
};

/**
 * 알림 설정 저장/업데이트
 * @param data 알림 설정 데이터
 */
export const updateNotificationSetting = async (
  data: UpdateNotificationSettingRequest
): Promise<NotificationSettingResponse> => {
  const response = await api.put<NotificationSettingResponse>(
    '/notification_setting',
    data
  );
  return response.data;
};
