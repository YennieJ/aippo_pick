// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  // 앱이 루트로 열리면 탭 홈으로 렌더링
  return <Redirect href="/(tabs)" />;
}