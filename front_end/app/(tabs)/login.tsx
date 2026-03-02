// app/(tabs)/login.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Kakao Native SDK (Dev Build 필요)
import {
  login as kakaoLogin,
  logout as kakaoLogout,
  KakaoOAuthToken,
  getProfile as kakaoGetProfile,
  KakaoProfile,
} from '@react-native-seoul/kakao-login';

// ✅ Google Sign-In (Dev Build 필요)
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

/* =========================================================
  ✅ 환경 설정
========================================================= */
const CONFIG = {
  // API 주소
  API_BASE_URL: __DEV__ ? 'http://localhost:8081' : 'https://api.aippopick.shop',

  // ✅ 카카오 설정
  KAKAO: {
    REST_API_KEY: 'bcd4aad8d33b30306ff700c24fc8d00b',
    NATIVE_APP_KEY: '6b4ad4a64e775ae17d3ffbf012e65d84',
    CLIENT_SECRET: undefined,
  },

  // ✅ 네이버 설정
  NAVER: {
    CLIENT_ID: 'bcd4aad8d33b30306ff700c24fc8d00b',
    CLIENT_SECRET: 'YOUR_NAVER_CLIENT_SECRET',
  },

  // ✅ 구글 설정
  GOOGLE: {
    WEB_CLIENT_ID: '450639430736-pablshju24jve9hkugus5l04qiotgupg.apps.googleusercontent.com',
  },
};

/* =========================================================
  Storage Keys
========================================================= */
const AUTH_KAKAO_V1 = 'AUTH_KAKAO_V1';
const AUTH_NAVER_V1 = 'AUTH_NAVER_V1';
const AUTH_GOOGLE_V1 = 'AUTH_GOOGLE_V1';

/* =========================================================
  OAuth Discovery Endpoints
========================================================= */
const KAKAO_DISCOVERY = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

const NAVER_DISCOVERY = {
  authorizationEndpoint: 'https://nid.naver.com/oauth2.0/authorize',
  tokenEndpoint: 'https://nid.naver.com/oauth2.0/token',
};

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/* =========================================================
  Type Definitions
========================================================= */
type KakaoMeResponse = {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
    email?: string;
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
};

type NaverProfile = {
  id: string;
  nickname?: string;
  name?: string;
  email?: string;
  profile_image?: string;
};

type GoogleProfile = {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
};

/* =========================================================
  Redirect URI Helper
========================================================= */
function makeLoginRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "frontend",   // ✅ app.config.js에 있는 scheme
    path: "login",        // ✅ 로그인 페이지에서 처리
    preferLocalhost: true,
  });
}

/* =========================================================
  Theme
========================================================= */
type Theme = {
  bg: string;
  card: string;
  card2: string;
  border: string;
  text: string;
  subText: string;
  overlayBg: string;
  kakaoBg: string;
  kakaoText: string;
  naverBg: string;
  naverText: string;
  googleBg: string;
  googleText: string;
  googleBorder: string;
  googleBadgeBg: string;
  googleBadgeText: string;
  googleBadgeBorder: string;
  appleBg: string;
  appleText: string;
  badgeText: string;
};

const lightTheme: Theme = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  card2: '#F9FAFB',
  border: '#E6E8EC',
  text: '#0B1220',
  subText: '#607086',
  overlayBg: 'rgba(0,0,0,0.45)',
  kakaoBg: '#FEE500',
  kakaoText: '#111111',
  naverBg: '#03C75A',
  naverText: '#FFFFFF',
  googleBg: '#FFFFFF',
  googleText: '#111111',
  googleBorder: '#E6E8EC',
  googleBadgeBg: '#FFFFFF',
  googleBadgeText: '#111111',
  googleBadgeBorder: '#D6DAE1',
  appleBg: '#111111',
  appleText: '#FFFFFF',
  badgeText: '#111111',
};

const darkTheme: Theme = {
  bg: '#0B1220',
  card: '#111B2F',
  card2: '#0E172A',
  border: 'rgba(255,255,255,0.08)',
  text: '#EAF1FF',
  subText: 'rgba(234,241,255,0.70)',
  overlayBg: 'rgba(0,0,0,0.55)',
  kakaoBg: '#FEE500',
  kakaoText: '#111111',
  naverBg: '#03C75A',
  naverText: '#FFFFFF',
  googleBg: '#FFFFFF',
  googleText: '#111111',
  googleBorder: '#E6E8EC',
  googleBadgeBg: '#FFFFFF',
  googleBadgeText: '#111111',
  googleBadgeBorder: '#D6DAE1',
  appleBg: '#111111',
  appleText: '#FFFFFF',
  badgeText: '#111111',
};

/* =========================================================
  Utility
========================================================= */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* =========================================================
  Main Screen
========================================================= */
export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const s = useMemo(() => styles(theme), [theme]);

  const [loadingProvider, setLoadingProvider] = useState<
    'KAKAO' | 'NAVER' | 'GOOGLE' | 'APPLE' | null
  >(null);

  const [kakaoProfile, setKakaoProfile] = useState<KakaoMeResponse | null>(null);
  const [naverProfile, setNaverProfile] = useState<NaverProfile | null>(null);
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);

  const redirectUri = useMemo(() => makeLoginRedirectUri(), []);
  const handledRef = useRef<{ kakao?: string; naver?: string }>({});
  const isBusy = loadingProvider !== null;

  /* ---------------------------------------------------------
    ✅ Google 설정 (1회)
  --------------------------------------------------------- */
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: CONFIG.GOOGLE.WEB_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);

  /* ---------------------------------------------------------
    ✅ Kakao Web (expo-auth-session)
  --------------------------------------------------------- */
  const isWeb = Platform.OS === 'web';
  const [kakaoRequest, kakaoResponse, kakaoPromptAsync] = isWeb
    ? AuthSession.useAuthRequest(
      {
        clientId: CONFIG.KAKAO.REST_API_KEY,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ['profile_nickname', 'account_email', 'profile_image'],
        usePKCE: false,
        extraParams: { prompt: 'login' },
      },
      KAKAO_DISCOVERY
    )
    : [null as any, null as any, (async () => { }) as any];

  /* ---------------------------------------------------------
    ✅ Naver Auth Request
  --------------------------------------------------------- */
  const [naverRequest, naverResponse, naverPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.NAVER.CLIENT_ID,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['profile', 'email'],
      usePKCE: false,
    },
    NAVER_DISCOVERY
  );

  /* ---------------------------------------------------------
    ✅ Google Web
  --------------------------------------------------------- */
  const googleWebCodeVerifierRef = useRef<string | null>(null);
  const googleWebRedirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        path: 'login',
        preferLocalhost: true,
      }),
    []
  );

  const [googleWebRequest, googleWebResponse, googleWebPromptAsync] =
    AuthSession.useAuthRequest(
      {
        clientId: CONFIG.GOOGLE.WEB_CLIENT_ID,
        redirectUri: googleWebRedirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        extraParams: { prompt: 'select_account' },
      },
      GOOGLE_DISCOVERY
    );

  /* ---------------------------------------------------------
    저장된 로그인 로드
  --------------------------------------------------------- */
  const loadAuth = useCallback(async () => {
    try {
      const [[, kakaoRaw], [, naverRaw], [, googleRaw]] = await AsyncStorage.multiGet([
        AUTH_KAKAO_V1,
        AUTH_NAVER_V1,
        AUTH_GOOGLE_V1,
      ]);

      const kakaoSaved = safeParse<{ profile?: KakaoMeResponse; me?: KakaoMeResponse }>(kakaoRaw);
      const naverSaved = safeParse<{ profile?: NaverProfile }>(naverRaw);
      const googleSaved = safeParse<{ profile?: GoogleProfile }>(googleRaw);

      if (kakaoSaved?.profile || kakaoSaved?.me) {
        setKakaoProfile(kakaoSaved.profile ?? kakaoSaved.me ?? null);
        setNaverProfile(null);
        setGoogleProfile(null);
        return;
      }

      if (naverSaved?.profile) {
        setNaverProfile(naverSaved.profile ?? null);
        setKakaoProfile(null);
        setGoogleProfile(null);
        return;
      }

      if (googleSaved?.profile) {
        setGoogleProfile(googleSaved.profile ?? null);
        setKakaoProfile(null);
        setNaverProfile(null);
        return;
      }

      setKakaoProfile(null);
      setNaverProfile(null);
      setGoogleProfile(null);
    } catch {
      setKakaoProfile(null);
      setNaverProfile(null);
      setGoogleProfile(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAuth();
      setLoadingProvider(null);
      handledRef.current = {};
    }, [loadAuth])
  );

  /* ---------------------------------------------------------
    ✅ Kakao Response (Web Only)
  --------------------------------------------------------- */
useEffect(() => {
  if (!kakaoResponse) return;

  if (kakaoResponse.type === 'success') {
    const code = kakaoResponse.params?.code;
    if (typeof code === 'string' && code) {
      if (isWeb) {
        void handleKakaoWebCode(code);
      } else {
        // ✅ 네이티브(Dev Client/Android/iOS)도 여기서 처리
        void handleKakaoNativeCode(code); // ← 없으면 너 기존 처리 함수로 연결
      }
    }
  } else if (kakaoResponse.type === 'dismiss' || kakaoResponse.type === 'cancel') {
    setLoadingProvider(null);
  }
}, [isWeb, kakaoResponse]);

  /* ---------------------------------------------------------
    ✅ Naver Response
  --------------------------------------------------------- */
  useEffect(() => {
    if (!naverResponse) return;

    if (naverResponse.type === 'success') {
      const code = naverResponse.params?.code;
      const state = naverResponse.params?.state;
      if (typeof code === 'string' && code) {
        void handleNaverCode(code, typeof state === 'string' ? state : undefined);
      }
    }

    if (naverResponse.type === 'dismiss' || naverResponse.type === 'cancel') {
      setLoadingProvider(null);
    }
  }, [naverResponse]);

  /* ---------------------------------------------------------
    ✅ Google Web Response
  --------------------------------------------------------- */
  useEffect(() => {
    if (!googleWebResponse) return;

    if (googleWebResponse.type === 'success') {
      const code = googleWebResponse.params?.code;
      if (typeof code === 'string' && code) {
        void handleGoogleWebCode(code);
      }
    }

    if (googleWebResponse.type === 'dismiss' || googleWebResponse.type === 'cancel') {
      setLoadingProvider(null);
    }
  }, [googleWebResponse]);

  /* ---------------------------------------------------------
    ✅ Kakao Native (App) - SDK 사용
  --------------------------------------------------------- */
  const handleKakaoNative = async () => {
    setLoadingProvider('KAKAO');
    try {
      console.log('[KAKAO_NATIVE] 로그인 시작');

      // 1. 로그인
      const token: KakaoOAuthToken = await kakaoLogin();
      console.log('[KAKAO_NATIVE] 토큰 받음:', token.accessToken ? '성공' : '실패');

      if (!token.accessToken) {
        throw new Error('카카오 액세스 토큰을 받지 못했습니다.');
      }

      // 2. 프로필 조회
      const profile: KakaoProfile = await kakaoGetProfile();
      console.log('[KAKAO_NATIVE] 프로필 조회 성공:', profile.nickname);

      // 3. 저장
      const kakaoData: KakaoMeResponse = {
        id: Number(profile.id) || 0,
        kakao_account: {
          profile: {
            nickname: profile.nickname,
            profile_image_url: profile.profileImageUrl,
          },
          email: profile.email,
        },
      };

      await AsyncStorage.multiRemove([AUTH_NAVER_V1, AUTH_GOOGLE_V1]);
      await AsyncStorage.setItem(
        AUTH_KAKAO_V1,
        JSON.stringify({
          provider: 'KAKAO',
          token,
          profile: kakaoData,
          savedAt: new Date().toISOString(),
          platform: Platform.OS,
        })
      );

      console.log('[KAKAO_NATIVE] 저장 완료. 페이지 이동');

      setKakaoProfile(kakaoData);
      setNaverProfile(null);
      setGoogleProfile(null);

      router.replace('/(tabs)/myPage');
    } catch (e: any) {
      console.error('[KAKAO_NATIVE] 로그인 실패:', e);
      Alert.alert('카카오 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoadingProvider(null);
    }
  };

  /* ---------------------------------------------------------
    ✅ Kakao Web Code 처리
  --------------------------------------------------------- */
  const handleKakaoWebCode = async (code: string) => {
    if (handledRef.current.kakao === code) return;
    handledRef.current.kakao = code;

    setLoadingProvider('KAKAO');
    try {
      console.log('[KAKAO_WEB] code 받음:', code);

      const token = await exchangeKakaoToken({ code, redirectUri });
      console.log('[KAKAO_WEB] 토큰 교환 성공');

      const me = await fetchKakaoMe(token.access_token);
      console.log('[KAKAO_WEB] 프로필 조회 성공:', me.kakao_account?.profile?.nickname);

      await AsyncStorage.multiRemove([AUTH_NAVER_V1, AUTH_GOOGLE_V1]);
      await AsyncStorage.setItem(
        AUTH_KAKAO_V1,
        JSON.stringify({
          provider: 'KAKAO',
          token,
          profile: me,
          savedAt: new Date().toISOString(),
          redirectUri,
          platform: 'web',
        })
      );

      setKakaoProfile(me);
      setNaverProfile(null);
      setGoogleProfile(null);

      router.replace('/(tabs)/myPage');
    } catch (e: any) {
      console.error('[KAKAO_WEB] 로그인 실패:', e);
      Alert.alert('카카오 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoadingProvider(null);
    }
  };

  async function handleKakaoNativeCode(code: string) {
  try {
    setLoadingProvider('KAKAO');
    // TODO: 너 백엔드 exchange 엔드포인트 호출
    // await api.post('/auth/kakao/exchange', { code, redirectUri: makeLoginRedirectUri() })
  } finally {
    setLoadingProvider(null);
  }
}

  /* ---------------------------------------------------------
    ✅ Naver Code 처리
  --------------------------------------------------------- */
  const handleNaverCode = async (code: string, state?: string) => {
    if (handledRef.current.naver === code) return;
    handledRef.current.naver = code;

    setLoadingProvider('NAVER');
    try {
      const token = await exchangeNaverToken({ code, state, redirectUri });
      const profile = await fetchNaverProfile(token.access_token);

      await AsyncStorage.multiRemove([AUTH_KAKAO_V1, AUTH_GOOGLE_V1]);
      await AsyncStorage.setItem(
        AUTH_NAVER_V1,
        JSON.stringify({
          provider: 'NAVER',
          token,
          profile,
          savedAt: new Date().toISOString(),
          redirectUri,
        })
      );

      setNaverProfile(profile);
      setKakaoProfile(null);
      setGoogleProfile(null);

      router.replace('/(tabs)/myPage');
    } catch (e: any) {
      console.error('Naver Login Error:', e);
      Alert.alert('네이버 로그인 실패', String(e?.message ?? e));
    } finally {
      setLoadingProvider(null);
    }
  };

  /* ---------------------------------------------------------
    ✅ Google Web Code 처리
  --------------------------------------------------------- */
  const handleGoogleWebCode = useCallback(
    async (code: string) => {
      setLoadingProvider('GOOGLE');
      try {
        const verifier = googleWebCodeVerifierRef.current;
        if (!verifier) {
          throw new Error('PKCE code_verifier가 없습니다.');
        }

        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/google/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: googleWebRedirectUri,
            codeVerifier: verifier,
          }),
        });

        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          throw new Error(json?.message ?? json?.error ?? `교환 실패 (${res.status})`);
        }

        const profile: GoogleProfile | undefined = json?.profile;
        if (!profile?.email && !profile?.name) {
          throw new Error('구글 프로필이 비어있습니다.');
        }

        await AsyncStorage.multiRemove([AUTH_KAKAO_V1, AUTH_NAVER_V1]);
        await AsyncStorage.setItem(
          AUTH_GOOGLE_V1,
          JSON.stringify({
            provider: 'GOOGLE',
            profile,
            tokens: json?.tokens,
            savedAt: new Date().toISOString(),
            platform: 'web',
          })
        );

        setGoogleProfile(profile);
        setKakaoProfile(null);
        setNaverProfile(null);

        router.replace('/(tabs)/myPage');
      } catch (e: any) {
        console.error('Google Web Login Error:', e);
        Alert.alert('구글 로그인 실패(Web)', String(e?.message ?? e));
      } finally {
        setLoadingProvider(null);
        googleWebCodeVerifierRef.current = null;
      }
    },
    [googleWebRedirectUri, router]
  );

  /* ---------------------------------------------------------
    ✅ 버튼 핸들러
  --------------------------------------------------------- */
  const onPressKakao = useCallback(async () => {
    try {
      setLoadingProvider('KAKAO');

      if (Platform.OS === 'web') {
        console.log('[KAKAO_WEB] redirectUri =', redirectUri);
        console.log('[KAKAO_WEB] authUrl =', kakaoRequest?.url);
        console.log('✅ LOGIN SCREEN FILE = app/(tabs)/login.tsx');
        console.log('✅ onPressKakao fired. Platform=', Platform.OS);
        console.log('✅ redirectUri =', redirectUri);
        console.log('✅ kakaoRequest?.url =', kakaoRequest?.url);
        if (!kakaoRequest) return Alert.alert('카카오', '요청 준비중입니다.');


        await kakaoPromptAsync();
        return;
      }

      // ✅ 앱(안드/iOS)은 네이티브 SDK 실행
      await handleKakaoNative();
    } catch (e: any) {
      Alert.alert('카카오', `오류: ${String(e?.message ?? e)}`);
    } finally {
      setLoadingProvider(null);
    }
  }, [kakaoRequest, kakaoPromptAsync, redirectUri, handleKakaoNative]);

  const onPressNaver = useCallback(async () => {
    if (!naverRequest) {
      return Alert.alert('네이버', '요청 준비중입니다.');
    }

    try {
      setLoadingProvider('NAVER');
      await naverPromptAsync();
    } catch (e: any) {
      setLoadingProvider(null);
      Alert.alert('네이버', `오류: ${String(e?.message ?? e)}`);
    }
  }, [naverRequest, naverPromptAsync]);

  const onPressGoogle = useCallback(async () => {
    // Web
    if (Platform.OS === 'web') {
      if (!googleWebRequest) {
        return Alert.alert('구글', '요청 준비중입니다.');
      }

      googleWebCodeVerifierRef.current = googleWebRequest.codeVerifier ?? null;

      try {
        setLoadingProvider('GOOGLE');
        await googleWebPromptAsync();
      } catch (e: any) {
        setLoadingProvider(null);
        Alert.alert('구글(Web)', `오류: ${String(e?.message ?? e)}`);
      }
      return;
    }

    // App
    try {
      setLoadingProvider('GOOGLE');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try {
        const hasPrev = await GoogleSignin.hasPreviousSignIn();
        if (hasPrev) await GoogleSignin.signOut();
      } catch { }

      const signInRes = (await GoogleSignin.signIn()) as any;
      const user = signInRes?.user ?? signInRes?.data?.user ?? signInRes?.data ?? signInRes ?? {};
      const tokens = await GoogleSignin.getTokens();

      const profile: GoogleProfile = {
        id: String(user?.id ?? ''),
        name: String(user?.name ?? ''),
        email: String(user?.email ?? ''),
        photo: String(user?.photo ?? ''),
      };

      await AsyncStorage.multiRemove([AUTH_KAKAO_V1, AUTH_NAVER_V1]);
      await AsyncStorage.setItem(
        AUTH_GOOGLE_V1,
        JSON.stringify({
          provider: 'GOOGLE',
          profile,
          tokens,
          savedAt: new Date().toISOString(),
          platform: Platform.OS,
        })
      );

      setGoogleProfile(profile);
      setKakaoProfile(null);
      setNaverProfile(null);

      router.replace('/(tabs)/myPage');
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('구글 로그인', 'Google Play 서비스가 필요합니다.');
        return;
      }
      Alert.alert('구글 로그인 실패(App)', String(e?.message ?? e));
    } finally {
      setLoadingProvider(null);
    }
  }, [googleWebRequest, googleWebPromptAsync, router]);

  const onPressApple = useCallback(() => {
    if (Platform.OS !== 'ios') {
      return Alert.alert('애플 로그인', 'iOS에서만 지원됩니다.');
    }
    Alert.alert('준비중', '애플 로그인은 다음 단계에서 구현됩니다.');
  }, []);

  /* ---------------------------------------------------------
    로그아웃
  --------------------------------------------------------- */
  const logoutAll = useCallback(async () => {
    await AsyncStorage.multiRemove([AUTH_KAKAO_V1, AUTH_NAVER_V1, AUTH_GOOGLE_V1]);

    // Kakao Native 로그아웃
    if (Platform.OS !== 'web') {
      try {
        await kakaoLogout();
      } catch { }
    }

    // Google 로그아웃
    if (Platform.OS !== 'web') {
      try {
        const hasPrev = await GoogleSignin.hasPreviousSignIn();
        if (hasPrev) await GoogleSignin.signOut();
      } catch { }
    }

    setKakaoProfile(null);
    setNaverProfile(null);
    setGoogleProfile(null);

    Alert.alert('로그아웃', '로그아웃 완료');
  }, []);

  /* ---------------------------------------------------------
    로그인 상태
  --------------------------------------------------------- */
  const loggedInName =
    kakaoProfile?.kakao_account?.profile?.nickname ||
    kakaoProfile?.properties?.nickname ||
    naverProfile?.nickname ||
    naverProfile?.name ||
    googleProfile?.name ||
    '';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.card}>
          {!!loggedInName ? (
            <View style={s.welcomeBox}>
              <Text style={s.welcomeName}>{loggedInName}</Text>
              <Text style={s.welcomeDesc}>연결된 계정으로 로그인되어 있습니다.</Text>
            </View>
          ) : (
            <View style={s.welcomeBox}>
              <Text style={s.welcomeTitle}>간편 로그인</Text>
              <Text style={s.welcomeDesc}>소셜 계정으로 빠르게 시작하세요</Text>
            </View>
          )}

          {!!kakaoProfile && (
            <ProviderCard
              title="카카오 계정"
              badgeLabel="KAKAO"
              badgeBg={theme.kakaoBg}
              badgeText={theme.badgeText}
              badgeBorderColor="transparent"
              name={
                kakaoProfile.kakao_account?.profile?.nickname ??
                kakaoProfile.properties?.nickname ??
                '-'
              }
              email={kakaoProfile.kakao_account?.email ?? '-'}
              showLogout={true}
              onLogout={logoutAll}
              theme={theme}
            />
          )}

          {!!naverProfile && (
            <ProviderCard
              title="네이버 계정"
              badgeLabel="NAVER"
              badgeBg={theme.naverBg}
              badgeText="#FFFFFF"
              badgeBorderColor="transparent"
              name={naverProfile.nickname ?? naverProfile.name ?? '-'}
              email={naverProfile.email ?? '-'}
              showLogout={true}
              onLogout={logoutAll}
              theme={theme}
            />
          )}

          {!!googleProfile && (
            <ProviderCard
              title="구글 계정"
              badgeLabel="GOOGLE"
              badgeBg={theme.googleBadgeBg}
              badgeText={theme.googleBadgeText}
              badgeBorderColor={theme.googleBadgeBorder}
              name={googleProfile.name ?? '-'}
              email={googleProfile.email ?? '-'}
              showLogout={true}
              onLogout={logoutAll}
              theme={theme}
            />
          )}

          {!loggedInName && (
            <View style={s.btnGroup}>
              <BrandButton
                title="카카오로 계속하기"
                leftIcon="chat"
                bg={theme.kakaoBg}
                textColor={theme.kakaoText}
                subColor={theme.kakaoText}
                borderColor="transparent"
                disabled={isBusy}
                loading={loadingProvider === 'KAKAO'}
                onPress={onPressKakao}
                theme={theme}
              />

              <BrandButton
                title="네이버로 계속하기"
                leftIcon="public"
                bg={theme.naverBg}
                textColor={theme.naverText}
                subColor="rgba(255,255,255,0.9)"
                borderColor="transparent"
                disabled={!naverRequest || isBusy}
                loading={loadingProvider === 'NAVER'}
                onPress={onPressNaver}
                theme={theme}
              />

              <BrandButton
                title="구글로 계속하기"
                leftIcon="account-circle"
                bg={theme.googleBg}
                textColor={theme.googleText}
                subColor="#666"
                borderColor={theme.googleBorder}
                disabled={isBusy}
                loading={loadingProvider === 'GOOGLE'}
                onPress={onPressGoogle}
                theme={theme}
              />

              <BrandButton
                title="애플로 계속하기"
                leftIcon="apple"
                bg={theme.appleBg}
                textColor={theme.appleText}
                subColor="rgba(255,255,255,0.75)"
                borderColor="transparent"
                disabled={isBusy}
                loading={loadingProvider === 'APPLE'}
                onPress={onPressApple}
                theme={theme}
              />
            </View>
          )}

          <View style={s.footerRow}>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => router.back()}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              <MaterialIcons name="arrow-back" size={18} color={theme.text} />
              <Text style={s.ghostText}>뒤로</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.smallInfo}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  '설정 정보',
                  `REST API: ${CONFIG.KAKAO.REST_API_KEY}\n` +
                  `Native Key: ${CONFIG.KAKAO.NATIVE_APP_KEY}\n` +
                  `Redirect: ${redirectUri}`
                )
              }
            />
          </View>
        </View>

        {isBusy && (
          <View style={[s.overlay, { backgroundColor: theme.overlayBg }]}>
            <View style={s.overlayCard}>
              <ActivityIndicator size="large" color={theme.text} />
              <Text style={s.overlayTitle}>로그인 처리중</Text>
              <Text style={s.overlayDesc}>잠시만 기다려주세요...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
  UI Components
========================================================= */
function BrandButton(props: {
  title: string;
  subtitle?: string;
  leftIcon: keyof typeof MaterialIcons.glyphMap;
  bg: string;
  textColor: string;
  subColor: string;
  borderColor: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  const s = useMemo(() => styles(props.theme), [props.theme]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        s.brandBtn,
        { backgroundColor: props.bg, borderColor: props.borderColor },
        props.disabled && s.disabled,
      ]}
    >
      <View style={s.brandIconLeft}>
        <View
          style={[s.iconCircle, props.borderColor !== 'transparent' && s.iconCircleLight]}
        >
          <MaterialIcons name={props.leftIcon} size={18} color={props.textColor} />
        </View>
      </View>

      <View style={s.brandCenter}>
        <Text style={[s.brandTitle, { color: props.textColor }]} numberOfLines={1}>
          {props.title}
        </Text>
        {!!props.subtitle && (
          <Text style={[s.brandSub, { color: props.subColor }]} numberOfLines={1}>
            {props.subtitle}
          </Text>
        )}
      </View>

      <View style={s.brandIconRight}>
        {props.loading ? (
          <ActivityIndicator color={props.textColor} />
        ) : (
          <MaterialIcons name="chevron-right" size={22} color={props.textColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function ProviderCard(props: {
  title: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorderColor: string;
  name: string;
  email: string;
  theme: Theme;
  showLogout?: boolean;
  onLogout?: () => void;
}) {
  const s = useMemo(() => styles(props.theme), [props.theme]);

  return (
    <View style={s.providerCard}>
      <View style={s.providerHead}>
        <View
          style={[
            s.badge,
            { backgroundColor: props.badgeBg, borderColor: props.badgeBorderColor },
          ]}
        >
          <Text style={[s.badgeText, { color: props.badgeText }]}>{props.badgeLabel}</Text>
        </View>
        <Text style={s.providerTitle}>{props.title}</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={s.providerLine}>이름: {props.name}</Text>
        <Text style={s.providerLine}>이메일: {props.email}</Text>
      </View>

      {!!props.showLogout && props.onLogout && (
        <TouchableOpacity style={s.logoutBtn} onPress={props.onLogout} activeOpacity={0.9}>
          <Text style={s.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* =========================================================
  OAuth Helper Functions
========================================================= */
async function exchangeKakaoToken(params: { code: string; redirectUri: string }) {
  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('client_id', CONFIG.KAKAO.REST_API_KEY);
  body.append('redirect_uri', params.redirectUri);
  body.append('code', params.code);
  if (CONFIG.KAKAO.CLIENT_SECRET) body.append('client_secret', CONFIG.KAKAO.CLIENT_SECRET);

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok || json?.error) {
    throw new Error(
      json?.error_description ?? json?.error ?? `카카오 토큰 발급 실패 (${res.status})`
    );
  }

  return json as { access_token: string; refresh_token?: string };
}

async function fetchKakaoMe(accessToken: string): Promise<KakaoMeResponse> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) throw new Error('카카오 프로필 조회 실패');

  return json as KakaoMeResponse;
}

async function exchangeNaverToken(params: {
  code: string;
  state?: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('client_id', CONFIG.NAVER.CLIENT_ID);
  body.append('client_secret', CONFIG.NAVER.CLIENT_SECRET);
  body.append('code', params.code);
  if (params.state) body.append('state', params.state);
  body.append('redirect_uri', params.redirectUri);

  const res = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok || json?.error) {
    throw new Error(
      json?.error_description ?? json?.error ?? `네이버 토큰 발급 실패 (${res.status})`
    );
  }

  return json as { access_token: string; refresh_token?: string };
}

async function fetchNaverProfile(accessToken: string): Promise<NaverProfile> {
  const res = await fetch('https://openapi.naver.com/v1/nid/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) throw new Error('네이버 프로필 조회 실패');
  if (json?.resultcode !== '00') throw new Error(json?.message ?? '네이버 프로필 응답 오류');

  return json.response as NaverProfile;
}

/* =========================================================
  Styles
========================================================= */
const styles = (theme: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 18, paddingBottom: 30 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 14,
      shadowColor: '#000',
      shadowOpacity: theme === darkTheme ? 0.22 : 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    welcomeBox: { gap: 6 },
    welcomeTitle: { color: theme.text, fontSize: 20, fontWeight: '900' },
    welcomeDesc: { color: theme.subText, fontSize: 14, lineHeight: 20 },
    welcomeName: { color: theme.text, fontSize: 22, fontWeight: '900' },
    btnGroup: { gap: 10 },
    brandBtn: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: theme === darkTheme ? 0.25 : 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    brandIconLeft: {
      position: 'absolute',
      left: 14,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    brandIconRight: {
      position: 'absolute',
      right: 14,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    brandCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 52,
    },
    iconCircle: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleLight: { backgroundColor: 'rgba(0,0,0,0.06)' },
    brandTitle: { fontSize: 16, fontWeight: '900' },
    brandSub: { fontSize: 12, marginTop: 2, fontWeight: '800', opacity: 0.95 },
    providerCard: {
      backgroundColor: theme.card2,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    providerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    providerTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '900' },
    providerLine: { color: theme.subText, fontSize: 13 },
    logoutBtn: {
      marginTop: 4,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    logoutText: { color: theme.text, fontWeight: '900' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    ghostBtn: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.card2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    ghostText: { color: theme.text, fontWeight: '800' },
    smallInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
    disabled: { opacity: 0.55 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    overlayCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.card,
      borderRadius: 18,
      padding: 18,
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    overlayTitle: { color: theme.text, fontWeight: '900', fontSize: 16 },
    overlayDesc: { color: theme.subText, fontWeight: '700' },
  });