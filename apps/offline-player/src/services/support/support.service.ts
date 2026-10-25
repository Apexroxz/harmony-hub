/**
 * Voluntary Contribution & Developer Support Service Boundary
 *
 * Provider-agnostic architecture for user-directed voluntary developer contributions.
 *
 * CRITICAL SCOPE:
 * - This is NOT a purchase of features, music, content, subscriptions, or digital services.
 * - Contribution amounts are completely user-controlled (no fixed tiers/paywalls).
 * - Multi-platform provider routing (Stripe for Web/Desktop, Apple IAP placeholder for iOS, Google Play placeholder for Android).
 * - ZERO track data, playlists, listening history, or audio binaries are ever transmitted.
 */

export type ContributionCurrency = "usd" | "eur" | "gbp" | "cad" | "aud" | "jpy" | "inr" | "chf";

export interface ContributionRequest {
  amount: number;
  currency?: ContributionCurrency;
  app_version?: string;
  platform?: string;
}

export interface ContributionSessionResult {
  success: boolean;
  checkoutUrl?: string;
  providerTransactionId?: string;
  error?: string;
}

export interface ProviderAvailability {
  available: boolean;
  reason?: string;
}

export interface IContributionProvider {
  readonly providerId: string;
  readonly displayName: string;
  getAvailability(): ProviderAvailability;
  createContribution(request: ContributionRequest): Promise<ContributionSessionResult>;
}

const DEFAULT_SUPABASE_URL = "https://baofrcldcymrpbsxyooy.supabase.co";

/**
 * ── 1. STRIPE CONTRIBUTION PROVIDER (Web / Direct Desktop) ──
 */
export class StripeContributionProvider implements IContributionProvider {
  public readonly providerId = "stripe";
  public readonly displayName = "Stripe (Card / Web / Desktop)";

  public getAvailability(): ProviderAvailability {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        available: false,
        reason: "An internet connection is required to make a contribution.",
      };
    }
    return { available: true };
  }

  private getEndpointUrl(): string {
    const baseUrl =
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
      DEFAULT_SUPABASE_URL;
    return `${baseUrl.replace(/\/$/, "")}/functions/v1/create-support-checkout`;
  }

  private getApiKey(): string {
    return (
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)) ||
      ""
    );
  }

  public async createContribution(request: ContributionRequest): Promise<ContributionSessionResult> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return {
        success: false,
        error: "An internet connection is required to make a contribution.",
      };
    }

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
          amount: request.amount,
          currency: request.currency || "usd",
          platform: request.platform || "web",
          app_version: request.app_version || "1.0.0-offline",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Unable to initialize checkout. Please try again.",
        };
      }

      return {
        success: true,
        checkoutUrl: data.checkout_url,
        providerTransactionId: data.provider_transaction_id,
      };
    } catch (networkError) {
      console.warn("[StripeContributionProvider] Network error during checkout initialization:", networkError);
      return {
        success: false,
        error: "An internet connection is required to make a contribution.",
      };
    }
  }
}

/**
 * ── 2. APPLE IN-APP CONTRIBUTION PROVIDER (iOS Placeholder) ──
 */
export class AppleContributionProvider implements IContributionProvider {
  public readonly providerId = "apple_iap";
  public readonly displayName = "Apple App Store (iOS)";

  public getAvailability(): ProviderAvailability {
    return {
      available: false,
      reason: "Apple In-App Contribution requires iOS native build packaging.",
    };
  }

  public async createContribution(_request: ContributionRequest): Promise<ContributionSessionResult> {
    return {
      success: false,
      error: "Apple In-App Contribution is only supported in native iOS builds.",
    };
  }
}

/**
 * ── 3. GOOGLE PLAY CONTRIBUTION PROVIDER (Android Placeholder) ──
 */
export class GoogleContributionProvider implements IContributionProvider {
  public readonly providerId = "google_play";
  public readonly displayName = "Google Play (Android)";

  public getAvailability(): ProviderAvailability {
    return {
      available: false,
      reason: "Google Play Contribution requires Android native build packaging.",
    };
  }

  public async createContribution(_request: ContributionRequest): Promise<ContributionSessionResult> {
    return {
      success: false,
      error: "Google Play Contribution is only supported in native Android builds.",
    };
  }
}

/**
 * ── SUPPORT SERVICE ORCHESTRATOR ──
 */
export class SupportService {
  private stripeProvider = new StripeContributionProvider();
  private appleProvider = new AppleContributionProvider();
  private googleProvider = new GoogleContributionProvider();

  public getPlatform(): "macos" | "windows" | "linux" | "android" | "ios" | "web" {
    if (typeof navigator === "undefined") return "web";
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "ios";
    if (userAgent.includes("android")) return "android";
    if (userAgent.includes("mac")) return "macos";
    if (userAgent.includes("win")) return "windows";
    if (userAgent.includes("linux")) return "linux";
    return "web";
  }

  public getActiveProvider(): IContributionProvider {
    const platform = this.getPlatform();
    if (platform === "ios") return this.appleProvider;
    if (platform === "android") return this.googleProvider;
    return this.stripeProvider;
  }

  public getAvailability(): ProviderAvailability {
    return this.getActiveProvider().getAvailability();
  }

  public validateAmount(amount: number): { valid: boolean; error?: string } {
    if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
      return { valid: false, error: "Please enter a valid numeric amount." };
    }
    if (amount <= 0) {
      return { valid: false, error: "Contribution amount must be greater than zero." };
    }
    if (amount < 0.50) {
      return { valid: false, error: "Minimum contribution amount is $0.50." };
    }
    if (amount > 10000) {
      return { valid: false, error: "Contribution amount cannot exceed $10,000." };
    }
    return { valid: true };
  }

  public async initiateContribution(
    amount: number,
    currency: ContributionCurrency = "usd",
    openDirectly: boolean = true,
  ): Promise<ContributionSessionResult> {
    // 1. Validation
    const validation = this.validateAmount(amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const provider = this.getActiveProvider();
    const availability = provider.getAvailability();
    if (!availability.available) {
      return { success: false, error: availability.reason || "Provider unavailable." };
    }

    const result = await provider.createContribution({
      amount,
      currency,
      platform: this.getPlatform(),
      app_version: "1.0.0-offline",
    });

    if (result.success && result.checkoutUrl && openDirectly && typeof window !== "undefined") {
      window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
    }

    return result;
  }
}

export const supportService = new SupportService();
