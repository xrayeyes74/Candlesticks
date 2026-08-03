import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xrayeyes74.candlestickpr',
  appName: 'Candlestick-Prediction',
  webDir: 'dist',
  server: {
    url: 'https://candlesticks-beryl.vercel.app',
    cleartext: false
  }
};

export default config;
