import type { Track, AudioFormat } from "@/domain/music/types";
import { extractAudioMetadata, type ExtractedMetadata } from "./audioMetadata";
import { getAudioFormatName, SUPPORTED_AUDIO_EXTENSIONS } from "@/domain/music/quality-tier";
import { storeAudioBlob, getAudioBlobUrl, deleteAudioBlob, getCachedAudioBlobUrl } from "./indexedDbAudio";
import cover1 from "@/assets/covers/cover-1.jpg";
import cover2 from "@/assets/covers/cover-2.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover4 from "@/assets/covers/cover-4.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";
import cover6 from "@/assets/covers/cover-6.jpg";

export interface LocalTrack extends Track {
  folderPath?: string;
  album?: string;
  year?: string;
  trackNumber?: number;
  fileSizeBytes?: number;
}

export interface LocalPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
}

export interface LocalAlbum {
  name: string;
  artistName: string;
  coverImage: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface LocalArtistGroup {
  artistName: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface LocalFolderGroup {
  folderPath: string;
  trackCount: number;
  tracks: LocalTrack[];
}

export interface OfflineSettings {
  gaplessPlayback: boolean;
  crossfadeSeconds: number;
  bufferSize: "Direct" | "Fast (64kb)" | "Audiophile (512kb)";
  highResOutput: boolean;
  autoRescan: boolean;
}

const LOCAL_TRACKS_KEY = "layam_local_tracks";
const LOCAL_PLAYLISTS_KEY = "layam_local_playlists";
const OFFLINE_SETTINGS_KEY = "layam_offline_settings";
const OFFLINE_EVENT = "layam:offline-updated";

const DEMO_TRACK_IDS = new Set([
  "midnight-protocol",
  "chain-reaction",
  "phantom-waves",
  "validator-dreams",
  "hash-rate",
  "genesis-block",
]);

const DEMO_ARTIST_NAMES = new Set([
  "neon drifter",
  "solana siren",
  "byte bass",
  "soundhelix collective",
]);

const DEMO_TITLES = new Set([
  "midnight protocol",
  "chain reaction",
  "phantom waves",
  "validator dreams",
  "hash rate",
  "genesis block",
]);

export const LOCAL_SAMPLE_TRACKS: LocalTrack[] = [];

export const DEFAULT_OFFLINE_SETTINGS: OfflineSettings = {
  gaplessPlayback: true,
  crossfadeSeconds: 2,
  bufferSize: "Audiophile (512kb)",
  highResOutput: true,
  autoRescan: true,
};

/**
 * Isolated Offline Service Layer.
 * Controls local audio file import, metadata extraction, IndexedDB persistence,
 * offline playlists, tag editing, and local discography grouping.
 */
export class OfflineService {
  private static listeners = new Set<() => void>();

  public static getTracks(): LocalTrack[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_TRACKS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as LocalTrack[];

      // Clean out legacy demo/mock items while strictly preserving all user-imported music
      const userTracks = parsed.filter((t) => {
        if (!t) return false;
        // User-imported tracks always have local identifiers or offline blob origins
        if (t.id && (t.id.startsWith("local-imported-") || t.id.startsWith("local-"))) {
          return true;
        }
        // Filter out legacy demo/mock catalog tracks
        const normTitle = (t.title || "").toLowerCase().trim();
        const normArtist = (t.artistName || t.artist || "").toLowerCase().trim();
        if (DEMO_TRACK_IDS.has(t.id)) return false;
        if (DEMO_TITLES.has(normTitle) && DEMO_ARTIST_NAMES.has(normArtist)) return false;
        return true;
      });

      // If any legacy demo tracks were pruned, update localStorage silently
      if (userTracks.length !== parsed.length) {
        const persistent = userTracks.map((t) => ({ ...t, audioUrl: "" }));
        localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(persistent));
      }

      return userTracks.map((t) => {
        const cachedUrl = getCachedAudioBlobUrl(t.id);
        if (cachedUrl) {
          return { ...t, audioUrl: cachedUrl };
        }
        return t;
      });
    } catch {
      return [];
    }
  }

  public static saveTracks(tracks: LocalTrack[]): void {
    if (typeof window === "undefined") return;
    try {
      // Strip transient/dead runtime blob URLs before persisting metadata to localStorage
      const persistentTracks = tracks.map((t) => ({ ...t, audioUrl: "" }));
      localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(persistentTracks));
      this.notify();
    } catch (e) {
      console.warn("[OfflineService] Failed to save tracks:", e);
    }
  }

  public static getPlaylists(): LocalPlaylist[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_PLAYLISTS_KEY);
      return stored ? (JSON.parse(stored) as LocalPlaylist[]) : [];
    } catch {
      return [];
    }
  }

  public static savePlaylists(playlists: LocalPlaylist[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_PLAYLISTS_KEY, JSON.stringify(playlists));
      this.notify();
    } catch (e) {
      console.warn("[OfflineService] Failed to save playlists:", e);
    }
  }

  public static getSettings(): OfflineSettings {
    if (typeof window === "undefined") return DEFAULT_OFFLINE_SETTINGS;
    try {
      const stored = localStorage.getItem(OFFLINE_SETTINGS_KEY);
      return stored ? { ...DEFAULT_OFFLINE_SETTINGS, ...JSON.parse(stored) } : DEFAULT_OFFLINE_SETTINGS;
    } catch {
      return DEFAULT_OFFLINE_SETTINGS;
    }
  }

  public static saveSettings(settings: OfflineSettings): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(OFFLINE_SETTINGS_KEY, JSON.stringify(settings));
      this.notify();
    } catch {}
  }

  public static async importFiles(
    files: FileList | File[],
    onProgress?: (progress: { current: number; total: number; filename: string; stage: string }) => void,
  ): Promise<LocalTrack[]> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return [];

    const existing = this.getTracks();
    const newTracks: LocalTrack[] = [];
    const updatedExisting = [...existing];
    const coverFallbackArray = [cover1, cover2, cover3, cover4, cover5, cover6];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]!;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      const isAudio =
        file.type.startsWith("audio/") ||
        SUPPORTED_AUDIO_EXTENSIONS.includes(ext) ||
        /\.(mp3|aac|m4a|ogg|opus|wav|flac|alac|aiff?)$/i.test(file.name);

      if (!isAudio) continue;

      onProgress?.({
        current: i + 1,
        total: fileArray.length,
        filename: file.name,
        stage: "Analyzing metadata & extracting audio headers",
      });

      let meta: ExtractedMetadata;
      try {
        meta = await extractAudioMetadata(file);
      } catch {
        meta = {
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "Local Artist",
          album: "Imported Files",
          duration: 180,
          format: getAudioFormatName(ext),
          bitrate: 320,
          sampleRate: 44100,
          bitDepth: 16,
        };
      }

      const rawTitle = meta.title || file.name.replace(/\.[^.]+$/, "");
      const rawArtist = meta.artist || "Local Artist";
      const normTitle = rawTitle.toLowerCase().trim();
      const normArtist = rawArtist.toLowerCase().trim();

      // Check for duplicate in existing tracks or newly processed batch
      const duplicateIndex = updatedExisting.findIndex((t) => {
        const sameFileName =
          t.title.toLowerCase().trim() === normTitle && t.fileSizeBytes === file.size;
        const sameMetadata =
          t.title.toLowerCase().trim() === normTitle &&
          (t.artistName || "").toLowerCase().trim() === normArtist &&
          Math.abs((t.duration || 0) - (meta.duration || 0)) <= 2;
        return sameFileName || sameMetadata;
      });

      if (duplicateIndex !== -1) {
        // Track already exists: re-store blob in IndexedDB for the existing track ID without adding a duplicate row
        const existingTrack = updatedExisting[duplicateIndex]!;
        const reloadedUrl = await storeAudioBlob(existingTrack.id, file, file.name);
        existingTrack.audioUrl = reloadedUrl;
        continue;
      }

      const trackId = `local-imported-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      onProgress?.({
        current: i + 1,
        total: fileArray.length,
        filename: file.name,
        stage: "Extracting artwork & securing in local vault",
      });
      const blobUrl = await storeAudioBlob(trackId, file, file.name);

      const relativePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath;
      const folderPath = relativePath
        ? relativePath.substring(0, relativePath.lastIndexOf("/"))
        : "Local Music";

      const localTrack: LocalTrack = {
        id: trackId,
        title: rawTitle,
        artistId: "local-device",
        artistName: rawArtist,
        artist: rawArtist,
        coverImage: meta.coverImage || coverFallbackArray[i % coverFallbackArray.length]!,
        audioUrl: blobUrl, // Immediate active blob URL for playback
        duration: meta.duration || 180,
        genre: meta.genre || "Audiophile Master",
        quality: meta.format || getAudioFormatName(ext),
        format: meta.format || getAudioFormatName(ext),
        source: "offline",
        bitrate: meta.bitrate || 1411,
        sampleRate: meta.sampleRate || 44100,
        bitDepth: meta.bitDepth || 16,
        playCount: 0,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        uploaderId: "local-device",
        folderPath,
        album: meta.album || "Local Master Imports",
        year: meta.year,
        trackNumber: meta.trackNumber,
        fileSizeBytes: file.size,
      };

      newTracks.push(localTrack);
      updatedExisting.unshift(localTrack);
    }

    if (newTracks.length > 0) {
      this.saveTracks(updatedExisting);
    }

    return newTracks;
  }

  public static isTrackDownloaded(trackId: string): boolean {
    const tracks = this.getTracks();
    return tracks.some((t) => t.id === trackId || t.id === `local-${trackId}`);
  }

  public static async saveTrackOffline(track: Track): Promise<void> {
    const existing = this.getTracks();
    const cleanId = track.id.startsWith("local-") ? track.id : `local-${track.id}`;
    if (this.isTrackDownloaded(track.id)) return;

    try {
      if (track.audioUrl && !track.audioUrl.startsWith("blob:")) {
        const res = await fetch(track.audioUrl);
        const blob = await res.blob();
        await storeAudioBlob(cleanId, blob, track.title);
      }
    } catch (err) {
      console.warn("[OfflineService] saveTrackOffline fetch note:", err);
    }

    const localTrack: LocalTrack = {
      ...track,
      id: cleanId,
      source: "offline",
      format: track.quality,
      artist: track.artistName,
      folderPath: "Saved Offline",
      album: track.album || "Layam Offline Vault",
      audioUrl: "", // Dynamically resolved on play from IndexedDB
      fileSizeBytes: track.duration * (track.bitrate || 1411) * 125,
    };

    this.saveTracks([localTrack, ...existing]);
  }

  public static async getTrackAudioUrl(trackId: string): Promise<string | null> {
    return getAudioBlobUrl(trackId);
  }

  public static async removeDownloadedTrack(trackId: string): Promise<void> {
    const existing = this.getTracks();
    const updated = existing.filter((t) => t.id !== trackId && t.id !== `local-${trackId}`);
    this.saveTracks(updated);
    try {
      await deleteAudioBlob(trackId);
    } catch {}
  }

  public static updateMetadata(trackId: string, patch: Partial<LocalTrack>): void {
    const existing = this.getTracks();
    const updated = existing.map((t) => {
      if (t.id === trackId) {
        return {
          ...t,
          ...patch,
          artist: patch.artistName || patch.artist || t.artistName,
          artistName: patch.artistName || patch.artist || t.artistName,
        };
      }
      return t;
    });
    this.saveTracks(updated);
  }

  public static createPlaylist(name: string): LocalPlaylist {
    const playlists = this.getPlaylists();
    const newPlaylist: LocalPlaylist = {
      id: `playlist-${Date.now()}`,
      name: name.trim() || "Untitled Audiophile Mix",
      trackIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.savePlaylists([newPlaylist, ...playlists]);
    return newPlaylist;
  }

  public static deletePlaylist(playlistId: string): void {
    const playlists = this.getPlaylists();
    this.savePlaylists(playlists.filter((p) => p.id !== playlistId));
  }

  public static addTrackToPlaylist(playlistId: string, trackId: string): void {
    const playlists = this.getPlaylists();
    const updated = playlists.map((p) => {
      if (p.id === playlistId && !p.trackIds.includes(trackId)) {
        return { ...p, trackIds: [...p.trackIds, trackId] };
      }
      return p;
    });
    this.savePlaylists(updated);
  }

  public static removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    const playlists = this.getPlaylists();
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
      }
      return p;
    });
    this.savePlaylists(updated);
  }

  public static groupAlbums(tracks: LocalTrack[]): LocalAlbum[] {
    const map = new Map<string, LocalTrack[]>();
    for (const t of tracks) {
      const albumName = t.album || "Single Tracks";
      const key = `${albumName}__${t.artistName}`;
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    }

    return Array.from(map.entries()).map(([key, groupTracks]) => {
      const [albumName, artistName] = key.split("__");
      return {
        name: albumName || "Single Tracks",
        artistName: artistName || "Unknown Artist",
        coverImage: groupTracks[0]?.coverImage || cover1,
        trackCount: groupTracks.length,
        tracks: groupTracks,
      };
    });
  }

  public static groupArtists(tracks: LocalTrack[]): LocalArtistGroup[] {
    const map = new Map<string, LocalTrack[]>();
    for (const t of tracks) {
      const artist = t.artistName || "Unknown Artist";
      const list = map.get(artist) || [];
      list.push(t);
      map.set(artist, list);
    }

    return Array.from(map.entries()).map(([artistName, groupTracks]) => ({
      artistName,
      trackCount: groupTracks.length,
      tracks: groupTracks,
    }));
  }

  public static groupFolders(tracks: LocalTrack[]): LocalFolderGroup[] {
    const map = new Map<string, LocalTrack[]>();
    for (const t of tracks) {
      const folder = t.folderPath || "Root Library";
      const list = map.get(folder) || [];
      list.push(t);
      map.set(folder, list);
    }

    return Array.from(map.entries()).map(([folderPath, groupTracks]) => ({
      folderPath,
      trackCount: groupTracks.length,
      tracks: groupTracks,
    }));
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify(): void {
    this.listeners.forEach((l) => l());
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(OFFLINE_EVENT));
  }
}
