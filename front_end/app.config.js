import 'dotenv/config';

export default ({ config }) => ({
  ...config,

  name: "아이뽀픽",
  slug: "front_end",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/android-icon-aippopick.png",
  scheme: "frontend",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.itl.aippopick",
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          "api.aippopick.shop": {
            NSIncludesSubdomains: true,
            NSExceptionAllowsInsecureHTTPLoads: false,
          },
        },
      },
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-aippopick.png",
      backgroundImage: "./assets/images/android-icon-aippopick.png",
      monochromeImage: "./assets/images/android-icon-aippopick.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.itl.aippopick",
    googleServicesFile: "./google-services.json",
    permissions: ["POST_NOTIFICATIONS"],
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/android-icon-aippopick.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],

    // Android HTTP 허용 (network_security_config.xml로 특정 도메인만 허용)
    // 프로덕션에서는 networkSecurityConfig만 사용하여 보안 강화

    // iOS 위젯 (WidgetKit)
    "./plugins/withIOSWidget",
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    router: {},
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL, // APK에서도 인식됨
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
