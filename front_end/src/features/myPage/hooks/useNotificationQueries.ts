import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import {
  getNotificationSetting,
  registerDevice,
  updateNotificationSetting,
} from '../api/notification';
import {
  RegisterDeviceRequest,
  UpdateNotificationSettingRequest,
} from '../types/notification.types';

/* =========================================================
   🔐 Device ID 생성/로드
========================================================= */
let cachedDeviceId: string | null = null;

export async function getStableDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let id: string | null = null;

  const { Platform } = require('react-native');
  if (Platform.OS === 'android') {
    id = Application.getAndroidId();
  }

  if (!id) {
    id = `${Application.applicationId}-${Application.nativeApplicationVersion}`;
  }

  cachedDeviceId = id;
  return id;
}

/**
 * 디바이스 등록/업데이트 뮤테이션
 */
export function useRegisterDevice() {
  return useMutation({
    mutationFn: async (data: RegisterDeviceRequest) => {
      return registerDevice(data);
    },
  });
}

/**
 * 알림 설정 조회 쿼리
 */
export function useNotificationSetting() {
  return useQuery({
    queryKey: ['notification', 'setting'],
    queryFn: async () => {
      const deviceId = await getStableDeviceId();
      return getNotificationSetting(deviceId);
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
}

/**
 * 알림 설정 업데이트 뮤테이션
 */
export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNotificationSettingRequest) => {
      return updateNotificationSetting(data);
    },
    onSuccess: () => {
      // 성공 시 쿼리 캐시 무효화하여 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: ['notification', 'setting'] });
    },
  });
}
