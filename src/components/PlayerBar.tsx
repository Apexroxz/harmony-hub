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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlayer, PLAYBACK_RATES } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Waveform } from "@/components/Waveform";
import { ArtistName } from "@/components/ArtistAvatar";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    playbackRate,
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

  const [queueOpen, setQueueOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);

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
                <span className="text-sm font-semibold">Queue</span>
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
                            i === queueIndex ? "text-primary" : "text-foreground"
                          )}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artistName}
                        </span>
                      </span>
                    </button>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDuration(track.duration)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${track.title} from queue`}
                      onClick={() => removeFromQueue(i)}
                      className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
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

      <motion.div
        initial={{ y: 96, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-glass-strong"
      >
        {/* Progress bar */}
        <div
          className="group relative h-1 w-full cursor-pointer bg-muted/30"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 rounded-full bg-primary opacity-0 shadow-[0_0_12px_var(--color-glow)] transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[26%] md:flex-none">
            <motion.div
              key={currentTrack.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <img
                src={currentTrack.coverImage}
                alt={`${currentTrack.title} album art`}
                width={48}
                height={48}
                className="h-11 w-11 rounded-lg object-cover shadow-lg sm:h-12 sm:w-12"
              />
              {isPlaying && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-glow)]" />
              )}
            </motion.div>
            <div className="min-w-0">
              <Link
                to="/track/$id"
                params={{ id: currentTrack.id }}
                className="block truncate text-sm font-semibold text-foreground hover:text-primary"
              >
                {currentTrack.title}
              </Link>
              <div className="truncate text-xs text-muted-foreground">
                <ArtistName
                  artistId={currentTrack.artistId}
                  name={currentTrack.artistName}
                  className="text-xs font-normal text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Controls */}
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
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_var(--color-glow-soft)] hover:bg-primary/90"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
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

          {/* Right controls */}
          <div className="flex flex-none items-center justify-end gap-1 md:w-[26%] md:gap-2">
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
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 1 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {queue.length}
                </span>
              )}
            </Button>

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
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                aria-label="Volume"
                onValueChange={(v) => {
                  const value = v[0];
                  if (typeof value === "number") setVolume(value / 100);
                }}
                className="w-20 lg:w-24"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
