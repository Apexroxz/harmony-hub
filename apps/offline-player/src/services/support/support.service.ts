/**
 * Voluntary Supporter & Patron Service Boundary
 *
 * Architecture for optional user contributions to support independent open development.
 */

export interface SupporterTier {
  id: string;
  name: string;
  amountUsd: number;
  description: string;
  perks: string[];
}

export const OFFLINE_SUPPORTER_TIERS: SupporterTier[] = [
  {
    id: "audiophile_supporter",
    name: "Audiophile Patron",
    amountUsd: 5,
    description: "Support continuous development of the 24-bit DSP audio engine.",
    perks: ["Supporter Badge in About Screen", "Early Access to Experimental Beta Builds"],
  },
  {
    id: "master_backer",
    name: "Master Backer",
    amountUsd: 20,
    description: "Fund advanced spatial room impulse research and open codec tooling.",
    perks: ["Supporter Badge", "Priority Feature Requests", "Developer Discord Access"],
  },
];

export interface ISupportService {
  getTiers(): SupporterTier[];
  initiateSupport(tierId: string): Promise<{ success: boolean; checkoutUrl?: string }>;
}

export class SupportService implements ISupportService {
  public getTiers(): SupporterTier[] {
    return OFFLINE_SUPPORTER_TIERS;
  }

  public async initiateSupport(tierId: string): Promise<{ success: boolean; checkoutUrl?: string }> {
    console.info(`[SupportService] Contribution initiated for tier: ${tierId}`);
    return {
      success: true,
      checkoutUrl: "https://layam.audio/support",
    };
  }
}

export const supportService = new SupportService();
