import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  HardDrive,
  Sliders,
  RotateCcw,
  X,
  Sparkles,
  Zap,
  Trash2,
  RefreshCw,
  FolderOpen,
  Volume2,
} from "lucide-react";
import { useAppMode } from "@/lib/mode";
import { usePlayer } from "@/lib/player";
import { OnlineMetadataService } from "@layam/storage-core";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OfflineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function OfflineSettingsModal({ open, onClose }: OfflineSettingsModalProps) {
  const {
    offlineSettings,
    updateOfflineSettings,
    storageUsedMb,
    localTracks,
    rescanLibrary,
    clearOfflineCache,
  } = useAppMode();

  const { crossfadeDuration, setCrossfadeDuration } = usePlayer();
  const [onlineOptIn, setOnlineOptIn] = useState(() => OnlineMetadataService.isOptInEnabled());

  const handleToggleOnlineMetadata = (enabled: boolean) => {
    OnlineMetadataService.setOptIn(enabled);
    setOnlineOptIn(enabled);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-card/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Offline Hi-Fi Settings</h2>
                <p className="text-xs text-muted-foreground">
                  DSP engine, local storage, and audio decoder controls.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Storage Meter Card */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-xs font-bold text-foreground">Local Audio Storage</span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {storageUsedMb >= 1000
                    ? `${(storageUsedMb / 1024).toFixed(2)} GB`
                    : `${storageUsedMb} MB`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Indexed across {localTracks.length} local FLAC/WAV/ALAC audio files and store
                downloads.
              </p>
            </div>

            {/* Gapless Playback Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div>
                <span className="text-xs font-bold text-foreground block">Gapless Playback</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Eliminates silence between consecutive tracks for continuous listening.
                </p>
              </div>
              <Button
                size="sm"
                variant={offlineSettings.gaplessPlayback ? "default" : "outline"}
                onClick={() =>
                  updateOfflineSettings({ gaplessPlayback: !offlineSettings.gaplessPlayback })
                }
                className={cn(
                  "rounded-full text-xs font-bold h-7 px-3",
                  offlineSettings.gaplessPlayback &&
                    "bg-emerald-500 text-white hover:bg-emerald-600",
                )}
              >
                {offlineSettings.gaplessPlayback ? "ENABLED" : "DISABLED"}
              </Button>
            </div>

            {/* Crossfade Duration */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">Track Crossfade</span>
                <span className="font-mono text-xs font-bold text-primary">
                  {crossfadeDuration === 0 ? "Off (0s)" : `${crossfadeDuration}s`}
                </span>
              </div>
              <Slider
                min={0}
                max={12}
                step={1}
                value={[crossfadeDuration]}
                onValueChange={([val]) => {
                  if (typeof val === "number") setCrossfadeDuration(val);
                }}
                className="my-3"
              />
              <p className="text-[11px] text-muted-foreground">
                Smoothly blends the end of the current song into the next.
              </p>
            </div>

            {/* Buffer Size */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <span className="text-xs font-bold text-foreground block mb-2">
                Audio Engine Buffer
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["Direct", "Fast (64kb)", "Audiophile (512kb)"] as const).map((buf) => (
                  <button
                    key={buf}
                    onClick={() => updateOfflineSettings({ bufferSize: buf })}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-semibold transition-all",
                      offlineSettings.bufferSize === buf
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                        : "border-border/40 bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {buf}
                  </button>
                ))}
              </div>
            </div>

            {/* Opt-In Online Metadata Enhancement */}
            <div className="rounded-2xl border border-border/40 bg-surface-raised p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Fetch Online Metadata</span>
                </div>
                <Button
                  size="sm"
                  variant={onlineOptIn ? "default" : "outline"}
                  onClick={() => handleToggleOnlineMetadata(!onlineOptIn)}
                  className={cn(
                    "rounded-full text-xs font-bold h-7 px-3",
                    onlineOptIn
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {onlineOptIn ? "OPT-IN ENABLED" : "LOCAL ONLY"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enhances missing high-res cover art (iTunes) and synchronized lyrics (LRCLIB) when connected. Cached in IndexedDB for permanent offline access.
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80">
                <span className={cn("inline-block h-2 w-2 rounded-full", typeof navigator !== "undefined" && navigator.onLine ? "bg-emerald-500" : "bg-zinc-500")} />
                <span>{typeof navigator !== "undefined" && navigator.onLine ? "ONLINE CONNECTION ACTIVE" : "OFFLINE / LOCAL STORAGE"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={rescanLibrary}
                className="rounded-full text-xs font-bold gap-1.5 border-border/60 flex-1 h-9"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Rescan Local Library
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearOfflineCache}
                className="rounded-full text-xs font-bold gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 flex-1 h-9"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Audio Cache
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
