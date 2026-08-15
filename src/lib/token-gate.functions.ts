import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TokenOwnershipService } from "@/domain/web3/token-ownership.service";

/**
 * Server-Side Token Gating Verification Endpoint.
 * Validates on-chain digital ownership or creator whitelist before issuing access grants.
 */

const VerifyTokenGateSchema = z.object({
  trackId: z.string().min(1).max(128),
  walletAddress: z.string().min(1).max(128).optional(),
  signature: z.string().max(512).optional(),
  providerId: z.string().max(32).optional(),
});

export interface TokenGateAccessResult {
  accessGranted: boolean;
  trackId: string;
  isTokenGated: boolean;
  reason?: string;
  expiresAt?: number;
  grantToken?: string;
}

export const verifyTokenGateAccess = createServerFn({ method: "POST" })
  .validator((input) => VerifyTokenGateSchema.parse(input))
  .handler(async ({ data }): Promise<TokenGateAccessResult> => {
    return TokenOwnershipService.verifyAndGrantAccess({
      trackId: data.trackId,
      walletAddress: data.walletAddress,
      signature: data.signature,
      providerId: data.providerId || "phantom",
    });
  });
