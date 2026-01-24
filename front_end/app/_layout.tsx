import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TouchableOpacity, View, Platform } from 'react-native';
import '../global.css';
import { IconSymbol } from '../src/shared';
import '../src/shared/api/client';
import { useColorScheme } from '../src/shared/hooks/use-color-scheme';

const WEB_MAX_WIDTH = 640;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const queryClient = new QueryClient();

  const isWeb = Platform.OS === 'web';

  return (
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
  );
}
