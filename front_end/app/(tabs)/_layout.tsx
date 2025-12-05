import { Tabs } from 'expo-router';
import React, { useEffect }  from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '../../src/shared/components/ui/icon-symbol';
import { Colors } from '../../src/shared/constants/theme';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

// ⭐ 최소 추가 import (푸시 + 디바이스 + axios)
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import Constants from 'expo-constants';

// ⭐ 1. Expo Go에서는 Push Token 요청 자체를 막기
function canRegisterPush() {
  // Expo Go → appOwnership === "expo"
  if (Constants.appOwnership === "expo") {
    console.log("🚫 Expo Go 환경 → push token 요청 skip");
    return false;
  }

  // 실제 앱 or Dev Build
  return true;
}

// ⭐ 2. 디바이스 + 권한 + FCM 토큰 발급 + 서버 등록
async function registerDeviceAtLaunch() {
  try {
    if (!canRegisterPush()) return;   // Expo Go에서는 즉시 종료

    if (!Device.isDevice) {
      console.log("🚫 Push는 디바이스에서만 가능");
      return;
    }

    // 권한 체크
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") {
        console.log("🚫 알림 권한 거부됨");
        return;
      }
    }

    // ⭐ FCM Token 가져오기 (Android)
    const push = await Notifications.getDevicePushTokenAsync();
    const fcmToken = push.data;

    // Device 식별값
    const deviceId =
      Device.osInternalBuildId ??
      Device.modelId ??
      `${Device.osName}-unknown`;

    console.log("📨 FCM Token:", fcmToken);

    // 서버 전송
    await axios.post("http://122.42.248.81:4000/user_device", {
  deviceId,
  fcmToken,
  osType: Device.osName,
});

    console.log("🟢 user_device 등록 완료");

  } catch (err) {
    console.log("🔥 user_device 등록 실패:", err);
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // ⭐ 앱 시작 시 1번 실행
  useEffect(() => {
    console.log("🔥 API_BASE_URL =", Constants.expoConfig?.extra?.apiBaseUrl);
    registerDeviceAtLaunch();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // 헤더 숨김
        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
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
        name="myPage"
        options={{
          title: 'MyPage',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="person.fill" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
