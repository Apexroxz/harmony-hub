import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Gauge,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer, PLAYBACK_RATES } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { AudioConsoleModal } from "./AudioConsoleModal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Waveform } from "@/components/Waveform";
import { ArtistName } from "@/components/ArtistAvatar";
import { BuyTrackModal } from "@/components/BuyTrackModal";
import { isTrackPurchased } from "@/domain/music/purchases";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const {
    currentTrack,
    status,
    errorMessage,
    isPlaying,
    isLoading,
    progress,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    playbackRate,
    eqEnabled,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    setPlaybackRate,
  } = usePlayer();

  const { isOnline } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  if (!currentTrack) return null;

  return (
    <>
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-[104px] right-2 z-50 max-h-[55vh] w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-border/60 bg-glass-strong shadow-2xl sm:right-6 sm:bottom-[108px]"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Master Queue</span>
                <span className="text-xs text-muted-foreground">{queue.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear queue"
                  onClick={clearQueue}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close queue"
                  onClick={() => setQueueOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ul className="max-h-[45vh] overflow-y-auto p-2">
              {queue.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nothing queued yet.
                </li>
              )}
              {queue.map((track, i) => (
                <li key={`${track.id}-${i}`}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-raised",
                      i === queueIndex && "bg-primary/10"
                    )}
                  >
                    <button
                      onClick={() => playFromQueue(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <img
                        src={track.coverImage}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            i === queueIndex ? "text-primary font-semibold" : "text-foreground"
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artistName} · <span className="font-mono text-[10px]">{track.quality}</span>
                        </span>
                      </span>
                    </button>
                    {i === queueIndex && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Playing
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove from queue"
                      onClick={() => removeFromQueue(i)}
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-glass-strong backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          {/* Track Info & Hi-Fi Identity */}
          <div className="flex min-w-0 items-center gap-3 md:w-[26%]">
            <Link
              to="/track/$id"
              params={{ id: currentTrack.id }}
              className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-raised shadow-md group"
            >
              <img
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                to="/track/$id"
                params={{ id: currentTrack.id }}
                className="block truncate text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                {currentTrack.title}
              </Link>
              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <ArtistName
                  artistId={currentTrack.artistId}
                  name={currentTrack.artistName}
                  className="text-xs font-normal text-muted-foreground truncate"
                />

                {/* Audiophile Quality Tag */}
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary text-[9px] font-mono font-bold px-1 py-0"
                >
                  {currentTrack.quality}
                  {currentTrack.bitDepth ? ` ${currentTrack.bitDepth}-bit` : ""}
                </Badge>

                {/* Direct Buy pill if online & unpurchased */}
                {isOnline &&
                  !currentTrack.id.startsWith("local-") &&
                  !currentTrack.id.startsWith("live-") &&
                  !isTrackPurchased(currentTrack.id) && (
                    <button
                      onClick={() => setBuyModalOpen(true)}
                      className="rounded-full bg-primary/20 hover:bg-primary hover:text-primary-foreground text-primary border border-primary/30 px-2 py-0 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Buy ${currentTrack.price?.toFixed(2) ?? "1.49"}
                    </button>
                  )}

                {status === "buffering" && (
                  <span className="text-[10px] text-amber animate-pulse font-bold">· Buffering</span>
                )}
                {status === "loading" && (
                  <span className="text-[10px] text-primary animate-pulse font-bold">· Loading Master</span>
                )}
                {status === "error" && (
                  <span className="text-[10px] text-destructive font-bold flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> Retry
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Playback Controls & Waveform */}
          <div className="flex flex-none items-center gap-1 sm:gap-2 md:flex-1 md:flex-col md:gap-1.5">
            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={playPrevious}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <SkipBack className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </Button>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  aria-label={
                    status === "loading"
                      ? "Loading audio"
                      : status === "buffering"
                      ? "Buffering stream"
                      : status === "playing"
                      ? "Pause"
                      : status === "error"
                      ? "Retry playback"
                      : "Play"
                  }
                  onClick={togglePlay}
                  className={cn(
                    "h-10 w-10 rounded-full shadow-[0_0_20px_var(--color-glow-soft)] transition-all",
                    status === "error"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : status === "playing" ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  )}
                </Button>
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next track"
                onClick={playNext}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="hidden w-full max-w-md items-center gap-3 md:flex">
              <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
                {formatDuration(currentTime)}
              </span>
              <div className="h-6 flex-1">
                <Waveform
                  seed={currentTrack.id}
                  peaks={currentTrack.waveform}
                  progress={progress}
                  bars={72}
                  onSeek={seek}
                />
              </div>
              <span className="w-10 font-mono text-[11px] text-muted-foreground">
                {formatDuration(duration || currentTrack.duration)}
              </span>
            </div>
          </div>

          {/* Right Console Shortcuts & Volume */}
          <div className="flex flex-none items-center justify-end gap-1 md:w-[26%] md:gap-2">
            {/* Audio Console Shortcut */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open Audio Console"
              onClick={() => setConsoleOpen(true)}
              className={cn(
                "h-8 w-8 transition-colors",
                eqEnabled
                  ? "text-primary bg-primary/10 shadow-[0_0_10px_var(--color-glow-soft)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="10-Band EQ & DSP Audio Console"
            >
              <Sliders className="h-4 w-4" />
            </Button>

            {/* Playback Speed */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Playback speed"
                onClick={() => {
                  setSpeedOpen((v) => !v);
                  setQueueOpen(false);
                }}
                className={cn(
                  "h-8 w-8 text-muted-foreground hover:text-foreground",
                  playbackRate !== 1 && "text-primary"
                )}
                title="Playback Speed"
              >
                <Gauge className="h-4 w-4" />
              </Button>
              <AnimatePresence>
                {speedOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute bottom-11 right-0 w-28 overflow-hidden rounded-xl border border-border/60 bg-glass-strong p-1 shadow-xl"
                  >
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          setSpeedOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-surface-raised",
                          rate === playbackRate ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        <span className="font-mono">{rate}×</span>
                        {rate === 1 && <span className="text-[10px]">normal</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle queue"
              onClick={() => {
                setQueueOpen((v) => !v);
                setSpeedOpen(false);
              }}
              className={cn(
                "relative h-8 w-8 text-muted-foreground hover:text-foreground",
                queueOpen && "text-primary"
              )}
              title="Queue Drawer"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 1 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {queue.length}
                </span>
              )}
            </Button>

            {/* Volume Control */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-20 lg:w-24">
                <Slider
                  value={[volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([val]) => setVolume(val / 100)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Console Modal */}
      <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />

      {/* Buy Master Modal */}
      <BuyTrackModal
        track={currentTrack}
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
      />
    </>
  );
}
