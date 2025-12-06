import axios from "axios";
import Constants from "expo-constants";

console.log("🔥 axios.init BASE_URL =", process.env.EXPO_PUBLIC_API_BASE_URL);

const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://122.42.248.81:4000"; // fallback

console.log("🔥 [client.ts] API_BASE_URL =", apiBaseUrl);

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});
