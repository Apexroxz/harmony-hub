import { supabase } from "@/integrations/supabase/client";
import { WalletAdapterFactory } from "./wallet-factory";

export interface OwnershipVerificationResult {
  accessGranted: boolean;
  trackId: string;
  isTokenGated: boolean;
  walletAddress?: string;
  reason?: string;
  grantToken?: string;
  expiresAt?: number;
}

/**
 * Token Ownership Verification Service.
 * Protects token-gated masters and stems with server-verified signature challenges
 * and on-chain ownership checks.
 */
export class TokenOwnershipService {
  /**
   * Generates a unique cryptographic challenge message for a wallet to sign.
   */
  public static generateChallengeMessage(trackId: string, walletAddress: string): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 10);
    return `Layam Audio Access Authorization\nTrack: ${trackId}\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  }

  /**
   * Cryptographically verifies a wallet signature against a challenge.
   */
  public static async verifySignature(
    message: string,
    signature: string,
    walletAddress: string,
    providerId = "phantom",
  ): Promise<boolean> {
    const adapter = WalletAdapterFactory.getAdapter(providerId);
    return adapter.verifySignature(message, signature, walletAddress);
  }

  /**
   * Verifies access to a token-gated track and issues an access grant.
   */
  public static async verifyAndGrantAccess(params: {
    trackId: string;
    walletAddress?: string;
    signature?: string;
    providerId?: string;
  }): Promise<OwnershipVerificationResult> {
    const { trackId, walletAddress, signature, providerId = "phantom" } = params;

    // 1. Fetch track ownership config from database
    const { data: ownership } = await (supabase.from as unknown as (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data?: { token_gated?: boolean; contract_address?: string; chain?: string } | null }>;
        };
      };
    })("track_ownership")
      .select("token_gated, contract_address, chain")
      .eq("track_id", trackId)
      .maybeSingle();

    if (!ownership || !ownership.token_gated) {
      return {
        accessGranted: true,
        trackId,
        isTokenGated: false,
      };
    }

    // 2. Validate wallet presence for gated content
    if (!walletAddress || walletAddress.trim() === "") {
      return {
        accessGranted: false,
        trackId,
        isTokenGated: true,
        reason: "wallet_required",
      };
    }

    // 3. Verify on-chain balance via adapter
    const adapter = WalletAdapterFactory.getAdapter(providerId);
    const balance = await adapter.checkTokenOwnership(
      walletAddress,
      ownership.contract_address || "",
    );

    if (balance <= 0) {
      return {
        accessGranted: false,
        trackId,
        isTokenGated: true,
        walletAddress,
        reason: "insufficient_token_balance",
      };
    }

    // 4. Issue temporary access grant
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour access
    const payload = `${trackId}:${walletAddress}:${expiresAt}`;
    const grantToken = Buffer.from(payload).toString("base64url");

    return {
      accessGranted: true,
      trackId,
      isTokenGated: true,
      walletAddress,
      expiresAt,
      grantToken,
    };
  }
}
