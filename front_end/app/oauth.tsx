// app/login/oauth.tsx
import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function OAuthBridge() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
    provider?: string;
  }>();

  useEffect(() => {
    const code = typeof params.code === "string" ? params.code : undefined;
    const state = typeof params.state === "string" ? params.state : undefined;
    const error = typeof params.error === "string" ? params.error : undefined;
    const provider = typeof params.provider === "string" ? params.provider : "naver";

    if (error) {
      router.replace({
        pathname: "/login/login",
        params: { error, provider },
      });
      return;
    }

    if (code) {
      router.replace({
        pathname: "/login/login",
        params: { code, state, provider },
      });
      return;
    }

    router.replace("/login/login");
  }, [params, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}