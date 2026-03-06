// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  // 앱이 루트로 열리면 탭 홈으로 보내버림
  return <Redirect href="/login/login" />;
}