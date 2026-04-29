import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bazaarbolt.app',
  appName: 'bazaarbolt',
  webDir: 'public',
  server: {
    url: 'https://bazaarbolt.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "711829893451-2ibiu1tvvv7ip479tt8r67lkli0rsld9.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
};

export default config;