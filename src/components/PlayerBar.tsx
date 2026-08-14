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
  ShoppingBag,
  Maximize2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer, PLAYBACK_RATES } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { AudioConsoleModal } from "./AudioConsoleModal";
import { FullscreenAudiophilePlayer } from "./FullscreenAudiophilePlayer";
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
    isExpanded,
    expandPlayer,
    collapsePlayer,
  } = usePlayer();

  const { isOnline, isOffline } = useAppMode();
  const [queueOpen, setQueueOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  if (!currentTrack) return null;

  return (
    <>
      {/* ── Queue Popover Drawer ── */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed bottom-[96px] right-3 z-50 max-h-[56vh] w-[min(92vw,24rem)] overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl sm:right-6"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5 bg-surface/50">
              <div className="flex items-center gap-2">
                <ListMusic className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Play Queue</span>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {queue.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear queue"
                  onClick={clearQueue}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close queue"
                  onClick={() => setQueueOpen(false)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <ul className="max-h-[44vh] overflow-y-auto p-2 space-y-1">
              {queue.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Queue is empty. Select a track or album to play.
                </li>
              )}
              {queue.map((track, i) => (
                <li key={`${track.id}-${i}`}>
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-2xl p-2 transition-all hover:bg-surface-raised",
                      i === queueIndex && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <button
                      onClick={() => playFromQueue(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <img
                        src={track.coverImage}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover shadow-sm shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-xs font-bold",
                            i === queueIndex ? "text-primary" : "text-foreground"
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                          {track.artistName} · <span className="font-mono text-[9px] font-bold text-primary">{track.quality}</span>
                        </span>
                      </div>
                    </button>

                    {i === queueIndex && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-mono font-extrabold text-primary shrink-0">
                        NOW
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove from queue"
                      onClick={() => removeFromQueue(i)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full shrink-0"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Luxury Audiophile Floating Player Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/90 backdrop-blur-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.85)]">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: Track Information & Master Quality Readout */}
          <div className="flex min-w-0 items-center gap-3.5 md:w-[28%]">
            {isOffline || currentTrack.id.startsWith("local-") || currentTrack.source === "offline" ? (
              <button
                onClick={expandPlayer}
                className="relative block h-13 w-13 shrink-0 overflow-hidden rounded-xl bg-surface-raised shadow-md group border border-border/40 text-left cursor-pointer"
                title="Expand Full Audiophile Console"
              >
                <img
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>
            ) : (
              <Link
                to="/track/$id"
                params={{ id: currentTrack.id }}
                className="relative block h-13 w-13 shrink-0 overflow-hidden rounded-xl bg-surface-raised shadow-md group border border-border/40"
              >
                <img
                  src={currentTrack.coverImage}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </Link>
            )}

            <div className="min-w-0 flex-1">
              {isOffline || currentTrack.id.startsWith("local-") || currentTrack.source === "offline" ? (
                <button
                  onClick={expandPlayer}
                  className="block truncate text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors text-left w-full cursor-pointer"
                >
                  {currentTrack.title}
                </button>
              ) : (
                <Link
                  to="/track/$id"
                  params={{ id: currentTrack.id }}
                  className="block truncate text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors"
                >
                  {currentTrack.title}
                </Link>
              )}

              <div className="flex items-center gap-2 truncate text-xs text-muted-foreground mt-0.5">
                <ArtistName
                  artistId={currentTrack.artistId}
                  name={currentTrack.artistName}
                  className="text-xs font-normal text-muted-foreground truncate"
                />

                {/* Audiophile Master Spec Badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[9px] font-bold px-1.5 py-0 rounded-full border",
                    isOffline
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-primary/40 text-primary bg-primary/10"
                  )}
                >
                  {currentTrack.quality}
                  {currentTrack.sampleRate && currentTrack.sampleRate >= 96000 ? " 24/96" : ""}
                </Badge>

                {/* Online Direct Buy action if unpurchased */}
                {isOnline &&
                  !currentTrack.id.startsWith("local-") &&
                  !currentTrack.id.startsWith("live-") &&
                  !isTrackPurchased(currentTrack.id) && (
                    <button
                      onClick={() => setBuyModalOpen(true)}
                      className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/15 hover:bg-primary hover:text-primary-foreground text-primary border border-primary/30 px-2 py-0 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <ShoppingBag className="h-2.5 w-2.5" />
                      Buy ${currentTrack.price?.toFixed(2) ?? "1.49"}
                    </button>
                  )}

                {status === "buffering" && (
                  <span className="text-[10px] text-amber animate-pulse font-bold">· Buffering</span>
                )}
                {status === "loading" && (
                  <span className="text-[10px] text-primary animate-pulse font-bold">· Loading</span>
                )}
                {status === "error" && (
                  <span className="text-[10px] text-destructive font-bold flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> Error
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Precision Playback Controls & Waveform Seekbar */}
          <div className="flex flex-none items-center gap-2 md:flex-1 md:flex-col md:gap-1 max-w-xl">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous track"
                onClick={playPrevious}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-transform active:scale-95"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </Button>

              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  size="icon"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className={cn(
                    "h-10 w-10 sm:h-11 sm:w-11 rounded-full shadow-lg transition-all",
                    isOffline
                      ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/25"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25"
                  )}
                >
                  {status === "loading" || status === "buffering" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isPlaying ? (
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
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full transition-transform active:scale-95"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </Button>
            </div>

            {/* Desktop Waveform & Seek Timeline */}
            <div className="hidden w-full items-center gap-2.5 md:flex">
              <span className="w-10 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatDuration(currentTime)}
              </span>

              <div className="relative flex-1">
                <Waveform
                  seed={currentTrack.id}
                  peaks={currentTrack.waveform}
                  progress={progress}
                  onSeek={seek}
                  className="h-3 w-full"
                />
              </div>

              <span className="w-10 text-left font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Studio Audio Console & Hardware Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 md:w-[28%]">
            {/* Audio Console / 10-Band EQ Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConsoleOpen(true)}
              className={cn(
                "h-8 rounded-full px-2.5 text-xs font-bold gap-1.5 transition-all border",
                eqEnabled
                  ? isOffline
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-sm"
                    : "border-primary/40 bg-primary/15 text-primary shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              )}
              title="Studio Audio Console & 10-Band EQ"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Console</span>
              {eqEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Button>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle playback queue"
              onClick={() => setQueueOpen((o) => !o)}
              className={cn(
                "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground relative transition-colors",
                queueOpen && "bg-surface-raised text-foreground"
              )}
              title="Master Queue"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>

            {/* Maximize / Fullscreen Audiophile Player Trigger */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Expand Audiophile Player"
              onClick={expandPlayer}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title="Expand Full Audiophile Player & Console"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Precision Volume */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-18 lg:w-22">
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

      {/* Fullscreen Audiophile Poweramp-Style Player Modal */}
      <FullscreenAudiophilePlayer
        open={isExpanded}
        onClose={collapsePlayer}
      />

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
