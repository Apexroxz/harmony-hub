/**
 * App Updates & Release Management Service Boundary
 *
 * Checks for official software updates, security patches, and changelogs
 * via the Supabase check-update Edge Function.
 *
 * OFFLINE-FIRST:
 * - If offline or network unreachable, fails gracefully without disrupting playback.
 * - ZERO music, audio files, library, playlists, DSP settings, or tracking IDs are transmitted.
 */

export type ReleaseChannel = "stable" | "beta" | "dev";
export type SupportedPlatform = "macos" | "windows" | "linux" | "android" | "ios" | "web";

export interface AppReleaseInfo {
  version: string;
  channel: ReleaseChannel;
  releaseTitle?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  installerType?: string;
  sha256?: string;
  signature?: string;
  minimumSupportedVersion?: string;
}

export interface AppUpdateCheckResult {
  success: boolean;
  status: "idle" | "checking" | "up_to_date" | "update_available" | "update_required" | "offline_error";
  message: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateRequired: boolean;
  release?: AppReleaseInfo | null;
}

export interface IUpdateService {
  checkForUpdates(channel?: ReleaseChannel): Promise<AppUpdateCheckResult>;
  getCurrentVersion(): string;
  getLastCheckedTime(): string;
  getPlatform(): SupportedPlatform;
}

const DEFAULT_SUPABASE_URL = "https://baofrcldcymrpbsxyooy.supabase.co";

export class UpdateService implements IUpdateService {
  private lastChecked: number = Date.now();
  private lastResult: AppUpdateCheckResult | null = null;

  public getCurrentVersion(): string {
    return "1.0.0-offline";
  }

  public getPlatform(): SupportedPlatform {
    if (typeof navigator === "undefined") return "web";
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac")) return "macos";
    if (userAgent.includes("win")) return "windows";
    if (userAgent.includes("android")) return "android";
    if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "ios";
    if (userAgent.includes("linux")) return "linux";
    return "web";
  }

  public getLastCheckedTime(): string {
    if (!this.lastResult) return "Just now";
    return new Date(this.lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  public getLastResult(): AppUpdateCheckResult | null {
    return this.lastResult;
  }

  private getEndpointUrl(): string {
    const baseUrl =
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
      DEFAULT_SUPABASE_URL;
    return `${baseUrl.replace(/\/$/, "")}/functions/v1/check-update`;
  }

  private getApiKey(): string {
    return (
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)) ||
      ""
    );
  }

  public async checkForUpdates(channel: ReleaseChannel = "stable"): Promise<AppUpdateCheckResult> {
    this.lastChecked = Date.now();
    const currentVersion = this.getCurrentVersion();
    const platform = this.getPlatform();

    // 1. Offline Detection
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const offlineResult: AppUpdateCheckResult = {
        success: false,
        status: "offline_error",
        message: "Unable to check for updates while offline.",
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
        updateRequired: false,
        release: null,
      };
      this.lastResult = offlineResult;
      return offlineResult;
    }

    // 2. Online Edge Function Request
    try {
      const endpoint = this.getEndpointUrl();
      const apiKey = this.getApiKey();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["apikey"] = apiKey;
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          current_version: currentVersion,
          platform,
          channel,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorResult: AppUpdateCheckResult = {
          success: false,
          status: "offline_error",
          message: data.error || "Unable to check for updates while offline.",
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
          updateRequired: false,
          release: null,
        };
        this.lastResult = errorResult;
        return errorResult;
      }

      const releaseObj: AppReleaseInfo | null = data.release
        ? {
            version: data.release.version,
            channel: data.release.channel,
            releaseTitle: data.release.release_title,
            releaseNotes: data.release.release_notes,
            publishedAt: data.release.published_at,
            downloadUrl: data.release.download_url,
            installerType: data.release.installer_type,
            sha256: data.release.sha256,
            signature: data.release.signature,
            minimumSupportedVersion: data.release.minimum_supported_version,
          }
        : null;

      let status: AppUpdateCheckResult["status"] = "up_to_date";
      let message = "You're running the latest stable version.";

      if (data.update_required) {
        status = "update_required";
        message = `Mandatory update required: Layam Hi-Fi ${data.latest_version} is available.`;
      } else if (data.update_available) {
        status = "update_available";
        message = `Layam Hi-Fi ${data.latest_version} is available.`;
      }

      const result: AppUpdateCheckResult = {
        success: true,
        status,
        message,
        currentVersion,
        latestVersion: data.latest_version || currentVersion,
        updateAvailable: Boolean(data.update_available),
        updateRequired: Boolean(data.update_required),
        release: releaseObj,
      };

      this.lastResult = result;
      return result;
    } catch (networkError) {
      console.warn("[UpdateService] Failed to check for updates:", networkError);
      const offlineResult: AppUpdateCheckResult = {
        success: false,
        status: "offline_error",
        message: "Unable to check for updates while offline.",
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
        updateRequired: false,
        release: null,
      };
      this.lastResult = offlineResult;
      return offlineResult;
    }
  }
}

export const updateService = new UpdateService();
