import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import messaging from '@react-native-firebase/messaging';
import { TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
import { ConfirmDialog, IconSymbol } from '../src/shared';
import { registerQueryClient } from '../src/shared/api/client';
import { useColorScheme } from '../src/shared/hooks/use-color-scheme';
import { checkAndRemoveLegacyDeviceId } from '../src/shared/utils/device-id.utils';

const queryClient = new QueryClient();
// axios 인터셉터에서 401 발생 시 React Query 캐시를 정리할 수 있도록 주입
registerQueryClient(queryClient);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 레거시 사용자 안내 다이얼로그 표시 여부
  const [isLegacyNoticeVisible, setIsLegacyNoticeVisible] = useState(false);

  // 포그라운드에서 FCM 메시지 수신 시 알림 표시 (iOS)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (_remoteMessage) => {
      // Android: FCM이 자동으로 알림 표시
      // iOS: 포그라운드에서 알림 표시 허용
    });
    return unsubscribe;
  }, []);

  // 기존 사용자 알림 설정 초기화 안내
  useEffect(() => {
    checkAndRemoveLegacyDeviceId().then((isLegacyUser) => {
      if (isLegacyUser) setIsLegacyNoticeVisible(true);
    });
  }, []);

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
                alignSelf: 'center',
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

            {/* 레거시 사용자 알림 설정 안내 */}
            <ConfirmDialog
              visible={isLegacyNoticeVisible}
              title="알림 설정 안내"
              message={
                '앱 업데이트로 알림 설정이 초기화되었습니다.\n마이페이지에서 알림을 다시 설정해주세요.'
              }
              confirmText="확인"
              hideCancel
              onConfirm={() => setIsLegacyNoticeVisible(false)}
            />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
