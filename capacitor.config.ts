import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.layam.hifi",
  appName: "Layam Hi-Fi",
  webDir: "dist/offline-player",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
