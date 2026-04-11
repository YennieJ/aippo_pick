import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '../../src/shared/components/ui/icon-symbol';
import { Colors } from '../../src/shared/constants/theme';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';
// --- Push & Device ---
import messaging from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import { useRegisterDevice } from '../../src/features/myPage';
import { getStableDeviceId } from '../../src/shared/utils/device-id.utils';

/* =========================================================
   🔐 1) 앱 전용 고정 Device ID 생성/로드
========================================================= */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const registerDeviceMutation = useRegisterDevice();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    const registerDeviceOnLaunch = async () => {
      try {
        if (!Device.isDevice) {
          return;
        }

        // 알림 권한 확인
        const authStatus = await messaging().hasPermission();
        if (
          authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
          authStatus !== messaging.AuthorizationStatus.PROVISIONAL
        ) {
          const newStatus = await messaging().requestPermission();
          if (
            newStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
            newStatus !== messaging.AuthorizationStatus.PROVISIONAL
          ) {
            return;
          }
        }

        // FCM Token
        const fcmToken = await messaging().getToken();

        // 고정 DeviceID
        const deviceId = await getStableDeviceId();
        const osType = Platform.OS;

        // 서버로 등록/업데이트
        await registerDeviceMutation.mutateAsync({
          deviceId,
          fcmToken,
          osType,
        });
      } catch (err) {
        // 디바이스 등록 실패
      }
    };

    registerDeviceOnLaunch();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false, // 헤더 숨김
        tabBarStyle: {
          height: (Platform.OS === 'ios' ? 55 : 70) + insets.bottom,
          paddingTop: Platform.OS === 'ios' ? 5 : 10,
          paddingBottom: insets.bottom,
          backgroundColor: Colors[colorScheme ?? 'light'].tabBarBackground,
          borderTopColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="magnifyingglass" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="myPage"
        options={{
          title: '마이',
          href: isWeb ? null : undefined, // 웹에서 숨김
          tabBarIcon: ({ color }) => (
            <IconSymbol name="person.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="termAndConditions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
