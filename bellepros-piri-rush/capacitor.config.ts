import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:    'com.bellepros.piri_rush',
  appName:  'Piri Rush',
  webDir:   '.',   // serve the root index.html
  bundledWebRuntime: false,

  server: {
    // For live reload during development:
    // url: 'http://YOUR_DEV_MACHINE_IP:7890',
    // cleartext: true,
  },

  plugins: {
    // ── Push Notifications (FCM / APNs) ──────────────
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // ── Local Notifications ───────────────────────────
    LocalNotifications: {
      smallIcon:    'ic_stat_icon_config_sample',
      iconColor:    '#E8192C',
      sound:        'beep.wav',
    },

    // ── Geolocation ───────────────────────────────────
    Geolocation: {
      // iOS: add NSLocationWhenInUseUsageDescription to Info.plist
      // Android: add ACCESS_FINE_LOCATION to AndroidManifest.xml
    },

    // ── Camera (AR mode) ─────────────────────────────
    Camera: {
      // iOS: add NSCameraUsageDescription to Info.plist
    },

    // ── Share API ─────────────────────────────────────
    Share: {},

    // ── Status Bar ────────────────────────────────────
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#14080A',
    },

    // ── Splash Screen ─────────────────────────────────
    SplashScreen: {
      launchShowDuration:         2000,
      launchAutoHide:             true,
      backgroundColor:            '#14080A',
      androidSplashResourceName:  'splash',
      androidScaleType:           'CENTER_CROP',
      showSpinner:                false,
      splashFullScreen:           true,
      splashImmersive:            true,
    },

    // ── In-App Review ─────────────────────────────────
    // Prompts for App Store review after significant play
    AppReview: {},

    // ── Haptics ───────────────────────────────────────
    Haptics: {},
  },

  ios: {
    contentInset:    'automatic',
    backgroundColor: '#14080A',
    preferredContentMode: 'mobile',
    // scheme: 'PiriRush',  // custom URL scheme for deeplinks
  },

  android: {
    backgroundColor: '#14080A',
    allowMixedContent: false,
    captureInput:    true,
    webContentsDebuggingEnabled: false, // set true during dev
  },
};

export default config;
