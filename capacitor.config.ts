import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bazaarbolt.app',
  appName: 'bazaarbolt',
  webDir: 'public',

  server: {
    url: 'https://bazaarbolt.vercel.app',
    cleartext: true
  }
};

export default config;