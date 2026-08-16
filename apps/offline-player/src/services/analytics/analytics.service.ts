/**
 * Anonymous Product Analytics Service Boundary
 *
 * Contract for non-intrusive, privacy-first telemetry.
 *
 * STRICT PRIVACY CONTRACT:
 * - Allowed: App open, playback errors, EQ usage counts, performance metrics, OS/version.
 * - PROHIBITED: Track names, artist tags, album names, file paths, or listening history.
 */

export type AnalyticsEventType =
  | "APP_OPENED"
  | "IMPORT_COMPLETED"
  | "PLAYBACK_STARTED"
  | "EQ_PRESET_CHANGED"
  | "NORMALIZER_TOGGLED"
  | "PLAYLIST_CREATED"
  | "APP_ERROR";

export interface AnalyticsPayload {
  eventType: AnalyticsEventType;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface IAnalyticsService {
  track(eventType: AnalyticsEventType, metadata?: Record<string, string | number | boolean>): Promise<void>;
  reportError(error: Error, context?: Record<string, string>): Promise<void>;
  setTelemetryEnabled(enabled: boolean): void;
  isTelemetryEnabled(): boolean;
}

const TELEMETRY_OPT_IN_KEY = "layam_telemetry_opt_in";

export class AnalyticsService implements IAnalyticsService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!this.instance) {
      this.instance = new AnalyticsService();
    }
    return this.instance;
  }

  public isTelemetryEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TELEMETRY_OPT_IN_KEY) === "true";
  }

  public setTelemetryEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TELEMETRY_OPT_IN_KEY, enabled ? "true" : "false");
  }

  public async track(
    eventType: AnalyticsEventType,
    metadata?: Record<string, string | number | boolean>,
  ): Promise<void> {
    if (!this.isTelemetryEnabled()) return;

    const payload: AnalyticsPayload = {
      eventType,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Staging / future pipeline placeholder (No external network requests in v1)
    if (process.env.NODE_ENV === "development") {
      console.debug("[Analytics:AnonymousEvent]", payload);
    }
  }

  public async reportError(error: Error, context?: Record<string, string>): Promise<void> {
    if (!this.isTelemetryEnabled()) return;

    const payload = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    console.warn("[Analytics:DiagnosticReport]", payload);
  }
}

export const analytics = AnalyticsService.getInstance();

