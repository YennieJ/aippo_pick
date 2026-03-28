import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Alert, TouchableOpacity, View, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
import { IconSymbol } from '../src/shared';
import '../src/shared/api/client';
import { useColorScheme } from '../src/shared/hooks/use-color-scheme';
import { checkAndRemoveLegacyDeviceId } from '../src/shared/utils/device-id.utils';

const WEB_MAX_WIDTH = 640;
const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 포그라운드에서 FCM 메시지 수신 시 알림 표시 (iOS)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (_remoteMessage) => {
      // Android: FCM이 자동으로 알림 표시
      // iOS: 포그라운드에서 알림 표시 허용
    });
    return unsubscribe;
  }, []);

  // iOS 포그라운드 알림 표시 설정
  useEffect(() => {
    if (Platform.OS === 'ios') {
      messaging().setForegroundPresentationOptions({
        alert: true,
        badge: true,
        sound: true,
      });
    }
  }, []);

  // 기존 사용자 알림 설정 초기화 안내
  useEffect(() => {
    checkAndRemoveLegacyDeviceId().then((isLegacyUser) => {
      if (isLegacyUser) {
        Alert.alert(
          '알림 설정 안내',
          '앱 업데이트로 알림 설정이 초기화되었습니다.\n마이페이지에서 알림을 다시 설정해주세요.',
        );
      }
    });
  }, []);

  const isWeb = Platform.OS === 'web';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
          >
            <View
              style={{
                flex: 1,
                width: '100%',
                maxWidth: isWeb ? WEB_MAX_WIDTH : undefined,
                alignSelf: 'center',
                ...(isWeb && {
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                }),
              }}
            >
              <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="ipo/ai-report"
                options={({ navigation }) => ({
                  title: 'AI 분석',
                  headerLeft: () => {
                    const isDark = colorScheme === 'dark';
                    return (
                      <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ paddingRight: 8 }}
                      >
                        <IconSymbol
                          name="chevron.left"
                          size={28}
                          color={isDark ? '#fff' : '#000'}
                        />
                      </TouchableOpacity>
                    );
                  },
                })}
              />
              <Stack.Screen
                name="ipo/[codeId]"
                options={({ navigation }) => ({
                  title: '공모주 상세',
                  headerLeft: () => {
                    const isDark = colorScheme === 'dark';
                    return (
                      <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{
                          paddingRight: 8,
                        }}
                      >
                        <IconSymbol
                          name="chevron.left"
                          size={28}
                          color={isDark ? '#fff' : '#000'}
                        />
                      </TouchableOpacity>
                    );
                  },
                })}
              />
            </Stack>
            </View>
            <StatusBar style="auto" translucent={false} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
