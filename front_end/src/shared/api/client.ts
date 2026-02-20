import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 개발: HTTP, 프로덕션: HTTPS
const apiBaseUrl = __DEV__
  ? 'http://122.42.248.81:4000'
  : (Constants.expoConfig?.extra?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    'https://api.aippopick.shop');

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
