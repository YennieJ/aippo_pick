// app/login.tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";

import {
  login as kakaoLogin,
  logout as kakaoLogout,
  KakaoOAuthToken,
  getProfile as kakaoGetProfile,
  KakaoProfile,
} from "@react-native-seoul/kakao-login";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

WebBrowser.maybeCompleteAuthSession();

/* =========================================================
  Config
========================================================= */
const CONFIG = {
  API_BASE_URL: __DEV__ ? "http://localhost:8081" : "https://api.aippopick.shop",
  KAKAO: {
    REST_API_KEY: "bcd4aad8d33b30306ff700c24fc8d00b",
    CLIENT_SECRET: undefined as string | undefined,
  },
  GOOGLE: {
    WEB_CLIENT_ID: "450639430736-pablshju24jve9hkugus5l04qiotgupg.apps.googleusercontent.com",
    ANDROID_CLIENT_ID: "450639430736-5bmhe4itcg2nm0jdsp1r1fnp32j5looi.apps.googleusercontent.com",
    IOS_CLIENT_ID: "",
  },
} as const;

const STORAGE_KEY = {
  KAKAO: "AUTH_KAKAO_V1",
  GOOGLE: "AUTH_GOOGLE_V1",
} as const;

const KAKAO_DISCOVERY = {
  authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
  tokenEndpoint: "https://kauth.kakao.com/oauth/token",
};
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

/* =========================================================
  ✅ SDK 초기화 – 모듈 레벨 (컴포넌트 mount 전 실행, useEffect 딜레이 없음)
========================================================= */
const IS_WEB = Platform.OS === "web";

// Google 초기화 (web 포함)
GoogleSignin.configure({
  webClientId: CONFIG.GOOGLE.WEB_CLIENT_ID,
  offlineAccess: false,
  forceCodeForRefreshToken: false,
});

/* =========================================================
  Types
========================================================= */
type Provider = "KAKAO" | "GOOGLE" | "APPLE";

type KakaoMeResponse = {
  id: number;
  kakao_account?: { profile?: { nickname?: string; profile_image_url?: string }; email?: string };
  properties?: { nickname?: string; profile_image?: string };
};
type GoogleProfile = { id?: string; name?: string; email?: string; photo?: string };

type AuthState =
  | { provider: "KAKAO"; profile: KakaoMeResponse }
  | { provider: "GOOGLE"; profile: GoogleProfile }
  | null;

/* =========================================================
  Theme
========================================================= */
type Theme = {
  bg: string; card: string; card2: string; border: string;
  text: string; subText: string; overlayBg: string;
  kakaoBg: string; kakaoText: string;
  googleBg: string; googleText: string; googleBorder: string;
  googleBadgeBg: string; googleBadgeText: string; googleBadgeBorder: string;
  badgeText: string;
};

const lightTheme: Theme = {
  bg: "#F5F6F8", card: "#FFFFFF", card2: "#F9FAFB", border: "#E6E8EC",
  text: "#0B1220", subText: "#607086", overlayBg: "rgba(0,0,0,0.45)",
  kakaoBg: "#FEE500", kakaoText: "#111111",
  googleBg: "#FFFFFF", googleText: "#111111", googleBorder: "#E6E8EC",
  googleBadgeBg: "#FFFFFF", googleBadgeText: "#111111", googleBadgeBorder: "#D6DAE1",
  badgeText: "#111111",
};
const darkTheme: Theme = {
  bg: "#0B1220", card: "#111B2F", card2: "#0E172A", border: "rgba(255,255,255,0.08)",
  text: "#EAF1FF", subText: "rgba(234,241,255,0.70)", overlayBg: "rgba(0,0,0,0.55)",
  kakaoBg: "#FEE500", kakaoText: "#111111",
  googleBg: "#FFFFFF", googleText: "#111111", googleBorder: "#E6E8EC",
  googleBadgeBg: "#FFFFFF", googleBadgeText: "#111111", googleBadgeBorder: "#D6DAE1",
  badgeText: "#111111",
};

/* =========================================================
  Utilities
========================================================= */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ✅ styles WeakMap 캐시 – 테마가 바뀔 때만 StyleSheet.create 실행
const styleCache = new WeakMap<Theme, ReturnType<typeof makeStyles>>();
function getStyles(theme: Theme) {
  if (!styleCache.has(theme)) styleCache.set(theme, makeStyles(theme));
  return styleCache.get(theme)!;
}

/* =========================================================
  Kakao OAuth helpers (웹)
========================================================= */
async function exchangeKakaoToken(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CONFIG.KAKAO.REST_API_KEY,
    redirect_uri: redirectUri,
    code,
    ...(CONFIG.KAKAO.CLIENT_SECRET ? { client_secret: CONFIG.KAKAO.CLIENT_SECRET } : {}),
  });
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || json?.error) throw new Error(json?.error_description ?? json?.error ?? `토큰 발급 실패 (${res.status})`);
  return json as { access_token: string; refresh_token?: string };
}

async function fetchKakaoMe(accessToken: string): Promise<KakaoMeResponse> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error("카카오 프로필 조회 실패");
  return json as KakaoMeResponse;
}

/* =========================================================
  Main Screen
========================================================= */
export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const s = getStyles(theme);

  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [auth, setAuth] = useState<AuthState>(null);
  const isBusy = loadingProvider !== null;

  const handledRef = useRef<Partial<Record<Provider, string>>>({});

  // ✅ withLoading – setLoadingProvider + try/finally 래퍼
  //    에러는 내부에서 Alert 처리 후 재throw 안 함 → 스피너가 절대 안 걸림
  const withLoading = useCallback(
    async (provider: Provider, fn: () => Promise<void>) => {
      setLoadingProvider(provider);
      try {
        await fn();
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        const isCancelled = msg.toLowerCase().includes("cancel") || e?.code === statusCodes.SIGN_IN_CANCELLED;
        if (!isCancelled) Alert.alert(`${provider} 로그인 실패`, msg);
      } finally {
        setLoadingProvider(null);
      }
    },
    []
  );

  /* ---- Web OAuth: Kakao ---- */
  const webRedirectUri = useMemo(
    () => (IS_WEB ? AuthSession.makeRedirectUri({ preferLocalhost: true }) : ""),
    []
  );
  const [kakaoRequest, kakaoResponse, kakaoPromptAsync] = IS_WEB
    ? AuthSession.useAuthRequest(
        {
          clientId: CONFIG.KAKAO.REST_API_KEY,
          redirectUri: webRedirectUri,
          responseType: AuthSession.ResponseType.Code,
          scopes: ["profile_nickname", "account_email", "profile_image"],
          usePKCE: false,
          extraParams: { prompt: "login" },
        },
        KAKAO_DISCOVERY
      )
    : ([null, null, async () => {}] as any);

  /* ---- Web OAuth: Google ---- */
  const googleWebRedirectUri = useMemo(
    () => AuthSession.makeRedirectUri({
      scheme: "frontend", path: "login/oauth",
      isTripleSlashed: true, preferLocalhost: true,
    }),
    []
  );
  const googleVerifierRef = useRef<string | null>(null);
  const [googleWebReq, googleWebResp, googleWebPrompt] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.GOOGLE.WEB_CLIENT_ID,
      redirectUri: googleWebRedirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      usePKCE: true,
      extraParams: { prompt: "select_account" },
    },
    GOOGLE_DISCOVERY
  );

  /* ---- 저장된 auth 로드 ---- */
  const loadAuth = useCallback(async () => {
    try {
      const [[, kr], [, gr]] = await AsyncStorage.multiGet([
        STORAGE_KEY.KAKAO, STORAGE_KEY.GOOGLE,
      ]);
      const kakao = safeParse<{ profile?: KakaoMeResponse; me?: KakaoMeResponse }>(kr);
      const google = safeParse<{ profile?: GoogleProfile }>(gr);

      const k = kakao?.profile ?? kakao?.me;
      if (k)              return setAuth({ provider: "KAKAO",  profile: k });
      if (google?.profile)return setAuth({ provider: "GOOGLE", profile: google.profile });
      setAuth(null);
    } catch {
      setAuth(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAuth();
      setLoadingProvider(null);
      handledRef.current = {};
    }, [loadAuth])
  );

  /* ---- Kakao web response ---- */
  useEffect(() => {
    if (!IS_WEB || !kakaoResponse) return;
    if (kakaoResponse.type === "success") {
      const code = kakaoResponse.params?.code;
      if (typeof code === "string" && code) void handleKakaoWebCode(code);
    } else {
      setLoadingProvider(null);
    }
  }, [kakaoResponse]);

  /* ---- Google web response ---- */
  useEffect(() => {
    if (!googleWebResp) return;
    if (googleWebResp.type === "success") {
      const code = googleWebResp.params?.code;
      if (typeof code === "string" && code) void handleGoogleWebCode(code);
    } else {
      setLoadingProvider(null);
    }
  }, [googleWebResp]);

  /* =========================================================
    ✅ saveAndNavigate – 저장 + 화면전환 병렬 처리
       저장이 끝나길 기다리지 않고 즉시 화면 전환 → 전환 딜레이 제거
  ========================================================= */
  const saveAndNavigate = useCallback(
    (key: string, value: object, removeKeys: string[], newAuth: AuthState) => {
      // 상태/화면 즉시 업데이트
      setAuth(newAuth);
      router.replace("/(tabs)/myPage");
      // 스토리지 저장은 백그라운드
      void AsyncStorage.multiRemove(removeKeys).then(() =>
        AsyncStorage.setItem(key, JSON.stringify(value))
      );
    },
    [router]
  );

  /* =========================================================
    Login handlers
  ========================================================= */

  // ── Kakao Native ──
  const handleKakaoNative = useCallback(async () => {
    void WebBrowser.dismissBrowser(); // ✅ await 제거 – 응답 기다리지 않음
    const token: KakaoOAuthToken = await kakaoLogin();
    if (!token.accessToken) throw new Error("카카오 액세스 토큰 없음");

    const p: KakaoProfile = await kakaoGetProfile();
    const profile: KakaoMeResponse = {
      id: Number(p.id) || 0,
      kakao_account: {
        profile: { nickname: p.nickname, profile_image_url: p.profileImageUrl },
        email: p.email,
      },
    };

    saveAndNavigate(
      STORAGE_KEY.KAKAO,
      { provider: "KAKAO", token, profile, savedAt: new Date().toISOString(), platform: Platform.OS },
      [STORAGE_KEY.GOOGLE],
      { provider: "KAKAO", profile }
    );
  }, [saveAndNavigate]);

  // ── Kakao Web code exchange ──
  const handleKakaoWebCode = useCallback(async (code: string) => {
    if (handledRef.current.KAKAO === code) return;
    handledRef.current.KAKAO = code;

    await withLoading("KAKAO", async () => {
      const token = await exchangeKakaoToken(code, webRedirectUri);
      const me = await fetchKakaoMe(token.access_token);
      saveAndNavigate(
        STORAGE_KEY.KAKAO,
        { provider: "KAKAO", token, profile: me, savedAt: new Date().toISOString(), platform: "web" },
        [STORAGE_KEY.GOOGLE],
        { provider: "KAKAO", profile: me }
      );
    });
  }, [webRedirectUri, withLoading, saveAndNavigate]);

  // ── Google Web code exchange ──
  const handleGoogleWebCode = useCallback(async (code: string) => {
    if (handledRef.current.GOOGLE === code) return;
    handledRef.current.GOOGLE = code;

    await withLoading("GOOGLE", async () => {
      const verifier = googleVerifierRef.current;
      if (!verifier) throw new Error("PKCE code_verifier 없음");

      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/google/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri: googleWebRedirectUri, codeVerifier: verifier }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? `교환 실패 (${res.status})`);

      const profile: GoogleProfile = json?.profile;
      if (!profile?.email && !profile?.name) throw new Error("구글 프로필 비어있음");

      googleVerifierRef.current = null;
      saveAndNavigate(
        STORAGE_KEY.GOOGLE,
        { provider: "GOOGLE", profile, tokens: json?.tokens, savedAt: new Date().toISOString(), platform: "web" },
        [STORAGE_KEY.KAKAO],
        { provider: "GOOGLE", profile }
      );
    });
  }, [googleWebRedirectUri, withLoading, saveAndNavigate]);

  /* ---- Button handlers ---- */
  const onPressKakao = useCallback(async () => {
    if (IS_WEB) {
      if (!kakaoRequest) return Alert.alert("카카오", "요청 준비중입니다.");
      setLoadingProvider("KAKAO");
      await kakaoPromptAsync();
      return;
    }
    await withLoading("KAKAO", handleKakaoNative);
  }, [kakaoRequest, kakaoPromptAsync, handleKakaoNative, withLoading]);

  const onPressGoogle = useCallback(async () => {
    if (IS_WEB) {
      if (!googleWebReq) return Alert.alert("구글", "요청 준비중입니다.");
      googleVerifierRef.current = googleWebReq.codeVerifier ?? null;
      setLoadingProvider("GOOGLE");
      try { await googleWebPrompt(); }
      catch (e: any) { setLoadingProvider(null); Alert.alert("구글(Web)", String(e?.message ?? e)); }
      return;
    }

    await withLoading("GOOGLE", async () => {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await GoogleSignin.signOut(); } catch {} // 계정 선택창 강제 표시

      const signInRes = (await GoogleSignin.signIn()) as any;
      const user = signInRes?.user ?? signInRes?.data?.user ?? signInRes?.data ?? signInRes ?? {};
      const tokens = await GoogleSignin.getTokens();

      const profile: GoogleProfile = {
        id: String(user?.id ?? ""),
        name: String(user?.name ?? ""),
        email: String(user?.email ?? ""),
        photo: String(user?.photo ?? ""),
      };

      saveAndNavigate(
        STORAGE_KEY.GOOGLE,
        { provider: "GOOGLE", profile, tokens, savedAt: new Date().toISOString(), platform: Platform.OS },
        [STORAGE_KEY.KAKAO],
        { provider: "GOOGLE", profile }
      );
    });
  }, [googleWebReq, googleWebPrompt, withLoading, saveAndNavigate]);

  const onPressApple = useCallback(() => {
    if (Platform.OS !== "ios") return Alert.alert("애플 로그인", "iOS 전용입니다.");
    Alert.alert("준비중", "다음 단계에서 구현됩니다.");
  }, []);

  /* ---- Logout ---- */
  const logoutAll = useCallback(async () => {
    setAuth(null); // ✅ UI 즉시 반영
    void AsyncStorage.multiRemove([STORAGE_KEY.KAKAO, STORAGE_KEY.GOOGLE]);
    if (!IS_WEB) {
      void Promise.allSettled([  // ✅ 병렬 처리
        kakaoLogout(),
        GoogleSignin.signOut(),
      ]);
    }
  }, []);

  /* ---- Derived display name ---- */
  const loggedInName =
    auth?.provider === "KAKAO"  ? (auth.profile.kakao_account?.profile?.nickname ?? auth.profile.properties?.nickname ?? "") :
    auth?.provider === "GOOGLE" ? (auth.profile.name ?? "") : "";

  /* =========================================================
    Render
  ========================================================= */
  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerTitle: "" }} />
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.card}>
          <View style={s.welcomeBox}>
            {loggedInName ? (
              <>
                <Text style={s.welcomeName}>{loggedInName}</Text>
                <Text style={s.welcomeDesc}>연결된 계정으로 로그인되어 있습니다.</Text>
              </>
            ) : (
              <>
                <Text style={s.welcomeTitle}>간편 로그인</Text>
                <Text style={s.welcomeDesc}>소셜 계정으로 빠르게 시작하세요</Text>
              </>
            )}
          </View>

          {auth?.provider === "KAKAO" && (
            <ProviderCard
              title="카카오 계정" badgeLabel="KAKAO"
              badgeBg={theme.kakaoBg} badgeText={theme.badgeText} badgeBorderColor="transparent"
              name={auth.profile.kakao_account?.profile?.nickname ?? auth.profile.properties?.nickname ?? "-"}
              email={auth.profile.kakao_account?.email ?? "-"}
              onLogout={logoutAll} theme={theme}
            />
          )}
          {auth?.provider === "GOOGLE" && (
            <ProviderCard
              title="구글 계정" badgeLabel="GOOGLE"
              badgeBg={theme.googleBadgeBg} badgeText={theme.googleBadgeText} badgeBorderColor={theme.googleBadgeBorder}
              name={auth.profile.name ?? "-"}
              email={auth.profile.email ?? "-"}
              onLogout={logoutAll} theme={theme}
            />
          )}

          {!loggedInName && (
            <View style={s.btnGroup}>
              <BrandButton
                title="카카오로 계속하기" leftIcon="chat"
                bg={theme.kakaoBg} textColor={theme.kakaoText}
                subColor={theme.kakaoText} borderColor="transparent"
                disabled={isBusy} loading={loadingProvider === "KAKAO"}
                onPress={onPressKakao} theme={theme}
              />
              <BrandButton
                title="구글로 계속하기" leftIcon="account-circle"
                bg={theme.googleBg} textColor={theme.googleText}
                subColor="#666" borderColor={theme.googleBorder}
                disabled={isBusy} loading={loadingProvider === "GOOGLE"}
                onPress={onPressGoogle} theme={theme}
              />
            </View>
          )}
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
type BrandButtonProps = {
  title: string; subtitle?: string;
  leftIcon: keyof typeof MaterialIcons.glyphMap;
  bg: string; textColor: string; subColor: string; borderColor: string;
  disabled?: boolean; loading?: boolean;
  onPress: () => void; theme: Theme;
};
const BrandButton = memo(function BrandButton(p: BrandButtonProps) {
  const s = getStyles(p.theme);
  return (
    <TouchableOpacity
      activeOpacity={0.9} disabled={p.disabled} onPress={p.onPress}
      style={[s.brandBtn, { backgroundColor: p.bg, borderColor: p.borderColor }, p.disabled && s.disabled]}
    >
      <View style={s.brandIconLeft}>
        <View style={[s.iconCircle, p.borderColor !== "transparent" && s.iconCircleLight]}>
          <MaterialIcons name={p.leftIcon} size={18} color={p.textColor} />
        </View>
      </View>
      <View style={s.brandCenter}>
        <Text style={[s.brandTitle, { color: p.textColor }]} numberOfLines={1}>{p.title}</Text>
        {p.subtitle && <Text style={[s.brandSub, { color: p.subColor }]} numberOfLines={1}>{p.subtitle}</Text>}
      </View>
      <View style={s.brandIconRight}>
        {p.loading
          ? <ActivityIndicator color={p.textColor} />
          : <MaterialIcons name="chevron-right" size={22} color={p.textColor} />
        }
      </View>
    </TouchableOpacity>
  );
});

type ProviderCardProps = {
  title: string; badgeLabel: string; badgeBg: string;
  badgeText: string; badgeBorderColor: string;
  name: string; email: string; theme: Theme;
  onLogout?: () => void;
};
const ProviderCard = memo(function ProviderCard(p: ProviderCardProps) {
  const s = getStyles(p.theme);
  return (
    <View style={s.providerCard}>
      <View style={s.providerHead}>
        <View style={[s.badge, { backgroundColor: p.badgeBg, borderColor: p.badgeBorderColor }]}>
          <Text style={[s.badgeText, { color: p.badgeText }]}>{p.badgeLabel}</Text>
        </View>
        <Text style={s.providerTitle}>{p.title}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.providerLine}>이름: {p.name}</Text>
        <Text style={s.providerLine}>이메일: {p.email}</Text>
      </View>
      {p.onLogout && (
        <TouchableOpacity style={s.logoutBtn} onPress={p.onLogout} activeOpacity={0.9}>
          <Text style={s.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

/* =========================================================
  Styles
========================================================= */
function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 18, paddingBottom: 30 },
    card: {
      backgroundColor: theme.card, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: theme.border, gap: 14,
      shadowColor: "#000", shadowOpacity: theme === darkTheme ? 0.22 : 0.12,
      shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 6,
    },
    welcomeBox: { gap: 6 },
    welcomeTitle: { color: theme.text, fontSize: 20, fontWeight: "900" },
    welcomeDesc: { color: theme.subText, fontSize: 14, lineHeight: 20 },
    welcomeName: { color: theme.text, fontSize: 22, fontWeight: "900" },
    btnGroup: { gap: 10 },
    brandBtn: {
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1,
      justifyContent: "center",
      shadowColor: "#000", shadowOpacity: theme === darkTheme ? 0.25 : 0.12,
      shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4,
    },
    brandIconLeft: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center" },
    brandIconRight: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
    brandCenter: { alignItems: "center", justifyContent: "center", paddingHorizontal: 52 },
    iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
    iconCircleLight: { backgroundColor: "rgba(0,0,0,0.06)" },
    brandTitle: { fontSize: 16, fontWeight: "900" },
    brandSub: { fontSize: 12, marginTop: 2, fontWeight: "800", opacity: 0.95 },
    providerCard: {
      backgroundColor: theme.card2, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: theme.border, gap: 10,
    },
    providerHead: { flexDirection: "row", alignItems: "center", gap: 10 },
    providerTitle: { color: theme.text, fontSize: 14, fontWeight: "900" },
    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: "900" },
    providerLine: { color: theme.subText, fontSize: 13 },
    logoutBtn: {
      marginTop: 4, borderRadius: 12, paddingVertical: 12, alignItems: "center",
      backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    },
    logoutText: { color: theme.text, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 20 },
    overlayCard: {
      width: "100%", maxWidth: 380, backgroundColor: theme.card, borderRadius: 18, padding: 18,
      alignItems: "center", gap: 10, borderWidth: 1, borderColor: theme.border,
    },
    overlayTitle: { color: theme.text, fontWeight: "900", fontSize: 16 },
    overlayDesc: { color: theme.subText, fontWeight: "700" },
  });
}