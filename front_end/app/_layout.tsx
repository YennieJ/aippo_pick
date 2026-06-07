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

import messaging from '@react-native-firebase/messaging';
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { AppState, Platform, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds from 'react-native-google-mobile-ads';
import '../global.css';
import { AuthGateProvider } from '../src/features/auth';
import { IconSymbol, ToastProvider } from '../src/shared';
import { registerQueryClient } from '../src/shared/api/client';
import { useColorScheme } from '../src/shared/hooks/use-color-scheme';

const queryClient = new QueryClient();
// axios 인터셉터에서 401 발생 시 React Query 캐시를 정리할 수 있도록 주입
registerQueryClient(queryClient);

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

  // ATT(App Tracking Transparency) 권한 요청 후 AdMob 초기화
  // iOS: requestTrackingPermissionsAsync는 init보다 먼저 호출해야 IDFA 기반 맞춤 광고가 동작.
  //      ATT 팝업은 앱이 active 상태일 때만 표시되므로 active를 보장한 뒤 호출.
  useEffect(() => {
    let cancelled = false;

    const waitUntilActive = () =>
      new Promise<void>((resolve) => {
        if (AppState.currentState === 'active') {
          resolve();
          return;
        }
        const sub = AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            sub.remove();
            resolve();
          }
        });
      });

    const run = async () => {
      try {
        // iOS에서만 ATT 요청 (Android는 해당 없음)
        if (Platform.OS === 'ios') {
          await waitUntilActive();
          if (cancelled) return;

          const { status } = await getTrackingPermissionsAsync();
          // 아직 미결정일 때만 팝업 표시 (이미 응답했으면 시스템이 팝업을 띄우지 않음)
          if (status === PermissionStatus.UNDETERMINED) {
            const result = await requestTrackingPermissionsAsync();
            if (__DEV__) {
              console.log('[att] tracking status:', result.status);
            }
          }
          if (cancelled) return;
        }

        await mobileAds().initialize();
        if (__DEV__) {
          console.log('[ads] mobile ads initialized');
        }
      } catch (e) {
        if (__DEV__) {
          console.log('[att/ads] error', e);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGateProvider>
            <ThemeProvider
              value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
            >
              <ToastProvider>
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
                  <Stack.Screen
                    name="withdraw"
                    options={({ navigation }) => ({
                      title: '회원 탈퇴',
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
                </Stack>
                </View>
                <StatusBar style="auto" translucent={false} />
              </ToastProvider>
            </ThemeProvider>
          </AuthGateProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
