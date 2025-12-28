import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '../../src/shared/components/ui/icon-symbol';
import { Colors } from '../../src/shared/constants/theme';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';
// --- Push & Device ---
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  getStableDeviceId,
  useRegisterDevice,
} from '../../src/features/myPage';

/* =========================================================
   🌈 탭 레이아웃
========================================================= */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const registerDeviceMutation = useRegisterDevice();

  useEffect(() => {
    const registerDeviceOnLaunch = async () => {
      try {
        // Expo Go에서는 서버 등록 불가 → 무시
        if (Constants.appOwnership === 'expo') {
          console.log('Expo Go → device 등록 스킵');
          return;
        }

        if (!Device.isDevice) {
          console.log('에뮬레이터 미지원');
          return;
        }

        // 🔔 알림 권한 확인
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          if (req.status !== 'granted') {
            console.log('알림 권한 거부됨');
            return;
          }
        }

        // 🔔 FCM Token 불러오기
        const tokenInfo = await Notifications.getDevicePushTokenAsync();
        const fcmToken = tokenInfo?.data ?? null;

        // 🔐 고정 DeviceID 가져오기
        const deviceId = await getStableDeviceId();
        const osType = Platform.OS;

        console.log('📱 DeviceID:', deviceId);
        console.log('🔔 FCM Token:', fcmToken);

        // ⭐ 서버로 등록/업데이트 (리액트 쿼리 사용)
        await registerDeviceMutation.mutateAsync({
          deviceId,
          fcmToken,
          osType,
        });
      } catch (err) {
        console.log('🔥 디바이스 등록 실패:', err);
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
          height: 70 + insets.bottom,
          paddingTop: 10,
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
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="magnifyingglass" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myPage"
        options={{
          title: 'MyPage',
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
