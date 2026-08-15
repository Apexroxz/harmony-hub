/**
 * Anonymous Device Identity Service
 *
 * Generates and stores an anonymous device identifier on the local machine.
 * This ID is used for future opt-in telemetry and diagnostic reporting without
 * linking to personal accounts or private files.
 */

const ANONYMOUS_DEVICE_KEY = "layam_offline_anonymous_device_id";

export interface AnonymousDeviceInfo {
  deviceId: string;
  appVersion: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  createdAt: string;
}

export class AnonymousDeviceService {
  public static getDeviceId(): string {
    if (typeof window === "undefined") return "server-environment";

    try {
      let id = localStorage.getItem(ANONYMOUS_DEVICE_KEY);
      if (!id) {
        id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(ANONYMOUS_DEVICE_KEY, id);
      }
      return id;
    } catch {
      return "ephemeral-device";
    }
  }

  public static getDeviceInfo(): AnonymousDeviceInfo {
    return {
      deviceId: this.getDeviceId(),
      appVersion: "1.0.0-offline",
      platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      screenResolution:
        typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown",
      createdAt: new Date().toISOString(),
    };
  }
}
