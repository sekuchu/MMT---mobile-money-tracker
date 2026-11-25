import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nas.mmt',
  appName: 'MMT',
  webDir: 'dist',
  plugins: {
    // Updates are checked in-app against the static manifest written by
    // scripts/publish-update.mjs, so the plugin must not poll on its own.
    CapacitorUpdater: {
      autoUpdate: 'off',
      appReadyTimeout: 10000,
      autoDeletePrevious: true,
    },
  },
};

export default config;
