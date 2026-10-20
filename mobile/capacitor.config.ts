import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Unskinned',
  // webDir must exist for the Capacitor CLI to be valid, but it is NOT the
  // app's runtime source. Because the web app is server-rendered (SSR) and
  // cannot be statically exported, the native shell loads the HOSTED site via
  // `server.url` below. www/index.html is only a placeholder fallback.
  webDir: 'www',
  backgroundColor: '#080f1e',
  server: {
    url: 'https://example.com',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // Show a short branded splash, then native-bridge.js calls hide() once
      // the remote web content has loaded.
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#080f1e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
