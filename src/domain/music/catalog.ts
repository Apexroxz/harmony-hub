import cover1 from "@/assets/covers/cover-1.jpg";
import cover2 from "@/assets/covers/cover-2.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover4 from "@/assets/covers/cover-4.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";
import cover6 from "@/assets/covers/cover-6.jpg";
import type { Artist, Track } from "./types";

export const artists: Artist[] = [
  {
    id: "neon-drifter",
    name: "Neon Drifter",
    handle: "@neondrifter",
    avatar: cover1,
    bio: "Lo-fi beats and midnight synths from the edge of the grid.",
    followers: 12400,
    verified: true,
  },
  {
    id: "solana-siren",
    name: "Solana Siren",
    handle: "@solanasiren",
    avatar: cover2,
    bio: "Vocal-driven electronic pop, released as limited editions.",
    followers: 8930,
    verified: true,
  },
  {
    id: "byte-bass",
    name: "Byte Bass",
    handle: "@bytebass",
    avatar: cover3,
    bio: "Deep bass experiments for late-night sessions and warehouse raves.",
    followers: 5620,
    verified: false,
  },
];

export const tracks: Track[] = [
  {
    id: "midnight-protocol",
    title: "Midnight Protocol",
    artistId: "neon-drifter",
    artistName: "Neon Drifter",
    coverImage: cover1,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 184,
    genre: "Synthwave",
    quality: "FLAC",
    bitrate: 1411,
    sampleRate: 44100,
    bitDepth: 16,
    playCount: 142300,
    likes: 9840,
    comments: 1260,
    createdAt: "2026-07-12",
  },
  {
    id: "chain-reaction",
    title: "Chain Reaction",
    artistId: "neon-drifter",
    artistName: "Neon Drifter",
    coverImage: cover2,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 226,
    genre: "Cyberpunk",
    quality: "WAV",
    bitrate: 4608,
    sampleRate: 96000,
    bitDepth: 24,
    playCount: 87600,
    likes: 6410,
    comments: 890,
    createdAt: "2026-06-28",
  },
  {
    id: "phantom-waves",
    title: "Phantom Waves",
    artistId: "solana-siren",
    artistName: "Solana Siren",
    coverImage: cover3,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 198,
    genre: "Electropop",
    quality: "FLAC",
    bitrate: 2304,
    sampleRate: 48000,
    bitDepth: 24,
    playCount: 210400,
    likes: 15200,
    comments: 2340,
    createdAt: "2026-07-30",
  },
  {
    id: "validator-dreams",
    title: "Validator Dreams",
    artistId: "solana-siren",
    artistName: "Solana Siren",
    coverImage: cover4,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 252,
    genre: "Alt-Pop",
    quality: "AAC",
    bitrate: 320,
    sampleRate: 48000,
    playCount: 54300,
    likes: 4120,
    comments: 470,
    createdAt: "2026-05-15",
  },
  {
    id: "hash-rate",
    title: "Hash Rate",
    artistId: "byte-bass",
    artistName: "Byte Bass",
    coverImage: cover5,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 174,
    genre: "Bass",
    quality: "ALAC",
    bitrate: 1411,
    sampleRate: 44100,
    bitDepth: 16,
    playCount: 67800,
    likes: 5230,
    comments: 610,
    createdAt: "2026-07-05",
  },
  {
    id: "genesis-block",
    title: "Genesis Block",
    artistId: "byte-bass",
    artistName: "Byte Bass",
    coverImage: cover6,
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: 241,
    genre: "Dubstep",
    quality: "MP3",
    bitrate: 320,
    sampleRate: 44100,
    playCount: 32100,
    likes: 2870,
    comments: 320,
    createdAt: "2026-04-20",
  },
];

export function getArtistById(id: string): Artist | undefined {
  return artists.find((a) => a.id === id);
}

export function getTrackById(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}

export function getTracksByArtist(artistId: string): Track[] {
  return tracks.filter((t) => t.artistId === artistId);
}

/** Baseline repost counts — social signal, kept out of the Track model. */
const repostCounts: Record<string, number> = {
  "midnight-protocol": 1260,
  "chain-reaction": 890,
  "phantom-waves": 2340,
  "validator-dreams": 470,
  "hash-rate": 610,
  "genesis-block": 320,
};

export function getRepostCount(trackId: string): number {
  return repostCounts[trackId] ?? 0;
}
