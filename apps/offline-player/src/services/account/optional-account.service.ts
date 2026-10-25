/**
 * Optional Layam Account Service Boundary
 *
 * PHILOSOPHY:
 * Layam Offline Player is strictly offline-first.
 * Accounts are 100% OPTIONAL and will only ever be used for voluntary
 * cloud backup of playlists and settings across personal devices.
 */

export interface OptionalAccountProfile {
  id: string;
  email?: string;
  isSupporter: boolean;
  supporterTier?: string;
  syncedPlaylistsCount: number;
  lastSyncedAt?: string;
}

export interface IOptionalAccountService {
  getProfile(): Promise<OptionalAccountProfile | null>;
  linkOptionalAccount(token: string): Promise<boolean>;
  unlinkAccount(): Promise<void>;
  syncPlaylists(): Promise<{ success: boolean; syncedCount: number }>;
}

export class OptionalAccountService implements IOptionalAccountService {
  public async getProfile(): Promise<OptionalAccountProfile | null> {
    return null; // Standalone v1 defaults to local-only
  }

  public async linkOptionalAccount(_token: string): Promise<boolean> {
    return false;
  }

  public async unlinkAccount(): Promise<void> {
    // No-op in offline mode
  }

  public async syncPlaylists(): Promise<{ success: boolean; syncedCount: number }> {
    return { success: false, syncedCount: 0 };
  }
}

export const optionalAccountService = new OptionalAccountService();
