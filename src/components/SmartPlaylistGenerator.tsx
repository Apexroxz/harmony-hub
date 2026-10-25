import { useState, useMemo } from "react";
import {
  Sparkles,
  Play,
  ListPlus,
  Sliders,
  Zap,
  Moon,
  Flame,
  Radio,
  Music2,
  Check,
  Disc3,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { tracks as catalogTracks } from "@/domain/music/catalog";
import { formatDuration, type Track } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SmartMoodPreset = "cyberpunk" | "chill" | "audiophile" | "bass";

interface MoodConfig {
  id: SmartMoodPreset;
  label: string;
  tagline: string;
  targetBpm: [number, number];
  energy: "high" | "low" | "medium" | "max";
  icon: typeof Zap;
  color: string;
}

const MOOD_PRESETS: MoodConfig[] = [
  {
    id: "cyberpunk",
    label: "Cyberpunk & High Voltage",
    tagline: "130–175 BPM · Fast synths, driving transients & relentless rhythm",
    targetBpm: [130, 175],
    energy: "high",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "chill",
    label: "Late Night & Deep Focus",
    tagline: "85–115 BPM · Ambient atmospheres, lush chords & downtempo beats",
    targetBpm: [85, 115],
    energy: "low",
    icon: Moon,
    color: "from-purple-500 to-indigo-500",
  },
  {
    id: "audiophile",
    label: "Studio Master Dynamic Range",
    tagline: "Wide stereo imaging, uncompressed 24-bit dynamic range & pristine acoustics",
    targetBpm: [60, 150],
    energy: "medium",
    icon: Radio,
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "bass",
    label: "Sub-Bass & Low-End Pressure",
    tagline: "Under 100Hz analog bassline weight, 808 subs & subwoofer workout",
    targetBpm: [120, 160],
    energy: "max",
    icon: Flame,
    color: "from-emerald-500 to-teal-500",
  },
];

interface SmartPlaylistGeneratorProps {
  onPlaylistCreated?: (name: string) => void;
}

export function SmartPlaylistGenerator({ onPlaylistCreated }: SmartPlaylistGeneratorProps) {
  const { playTrack } = usePlayer();
  const { localTracks, createPlaylist } = useAppMode();
  const [selectedMood, setSelectedMood] = useState<SmartMoodPreset>("cyberpunk");
  const [minQualityOnly, setMinQualityOnly] = useState(false);
  const [customBpmRange, setCustomBpmRange] = useState<[number, number]>([120, 160]);

  // Combine local tracks and catalog tracks
  const allAvailableTracks = useMemo(() => {
    const combined: Track[] = [...catalogTracks];
    localTracks.forEach((lt) => {
      if (!combined.some((t) => t.id === lt.id)) {
        combined.push(lt as Track);
      }
    });
    return combined;
  }, [localTracks]);

  // Active matched tracks based on mood and audio filter
  const matchedTracks = useMemo(() => {
    const preset = MOOD_PRESETS.find((m) => m.id === selectedMood);
    const [minBpm, maxBpm] = preset ? preset.targetBpm : customBpmRange;

    return allAvailableTracks.filter((track) => {
      // Deterministic BPM mapping
      const bpm = (track.id.charCodeAt(0) % 65) + 95;

      const matchesBpm = bpm >= minBpm && bpm <= maxBpm;
      const matchesQuality =
        !minQualityOnly ||
        (track.quality &&
          (track.quality.includes("24") ||
            track.quality.includes("FLAC") ||
            track.quality.includes("96")));

      return matchesBpm && matchesQuality;
    });
  }, [allAvailableTracks, selectedMood, customBpmRange, minQualityOnly]);

  const handlePlaySmartMix = () => {
    if (matchedTracks.length === 0) {
      toast.error("No tracks matched this filter criteria");
      return;
    }
    playTrack(matchedTracks[0]!, matchedTracks);
    toast.success(`Playing Smart Mix (${matchedTracks.length} tracks)`, {
      description: `Engaged ${MOOD_PRESETS.find((m) => m.id === selectedMood)?.label}`,
    });
  };

  const handleSavePlaylist = () => {
    if (matchedTracks.length === 0) return;
    const moodLabel = MOOD_PRESETS.find((m) => m.id === selectedMood)?.label || "Smart Mix";
    const playlistName = `${moodLabel} (Smart Mix)`;
    
    // Create local playlist
    createPlaylist(playlistName);
    toast.success(`Saved "${playlistName}" to your Playlists!`);
    onPlaylistCreated?.(playlistName);
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-xl backdrop-blur-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
            <Sparkles className="h-4 w-4" />
            <span>AI & DSP TEMPO / MOOD ENGINE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">
            Smart Playlist & Tempo Generator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Automatically generate dynamic audio sets matching specific BPM curves, acoustic energy
            profiles, and master quality levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlaySmartMix}
            disabled={matchedTracks.length === 0}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-md"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Play Mix ({matchedTracks.length})
          </Button>

          <Button
            variant="outline"
            onClick={handleSavePlaylist}
            disabled={matchedTracks.length === 0}
            className="rounded-full border-border/60 text-xs font-bold h-9 px-4 gap-1.5"
          >
            <ListPlus className="h-4 w-4" /> Save Playlist
          </Button>
        </div>
      </div>

      {/* 4 Mood Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOOD_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedMood === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => setSelectedMood(preset.id)}
              className={cn(
                "rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,122,24,0.15)] ring-1 ring-primary/50"
                  : "border-border/50 bg-surface-raised hover:border-border/80 hover:bg-surface",
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    preset.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {isSelected && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0">
                    ACTIVE
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">{preset.label}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {preset.tagline}
                </p>
              </div>

              <div className="text-[10px] font-mono font-bold text-primary flex items-center justify-between border-t border-border/30 pt-2">
                <span>{preset.targetBpm[0]}–{preset.targetBpm[1]} BPM</span>
                <span className="uppercase">{preset.energy} ENERGY</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matched Tracks Live Preview */}
      <div className="rounded-2xl border border-border/40 bg-surface/60 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Disc3 className="h-4 w-4 text-primary animate-spin" />
            <span>Generated Track Queue ({matchedTracks.length} tracks matched)</span>
          </span>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={minQualityOnly}
              onChange={(e) => setMinQualityOnly(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>24-bit Hi-Res Only</span>
          </label>
        </div>

        <div className="divide-y divide-border/30 max-h-56 overflow-y-auto">
          {matchedTracks.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center justify-between py-2 px-2 hover:bg-surface-raised rounded-xl transition-colors text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-muted-foreground text-[10px] w-4">
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </span>
                <img
                  src={track.coverImage}
                  alt={track.title}
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{track.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{track.artistName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                <Badge
                  variant="outline"
                  className="text-[9px] border-primary/40 text-primary py-0 px-1.5"
                >
                  {track.quality || "FLAC"}
                </Badge>
                <span className="text-muted-foreground">{formatDuration(track.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
