import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://api.aippopick.shop';

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  // 웹 환경에서 CORS 오류 방지
  ...(Platform.OS === 'web' && {
    withCredentials: false,
    headers: {
      'Content-Type': 'application/json',
    },
  }),
});

