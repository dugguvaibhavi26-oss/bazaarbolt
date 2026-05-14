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
      serverClientId: "818818818818-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
};

export default config;