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
    appleTeamId: "LQ97BNQH9G",
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

    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
        },
      },
    ],

    // iOS 위젯 (WidgetKit)
    "./plugins/withIOSWidget",

    // Xcode 14+ resource bundle signing fix
    "./plugins/withPodfileResourceBundleFix",
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    router: {},
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL, // APK에서도 인식됨
    eas: {
      projectId: "cf310020-316f-4ac6-924d-f4272a955923",
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: "IPOWidget",
                bundleIdentifier: "com.itl.aippopick.widget",
                entitlements: {
                  "com.apple.security.application-groups": [
                    "group.com.itl.aippopick",
                  ],
                },
              },
            ],
          },
        },
      },
    },
  },
});
