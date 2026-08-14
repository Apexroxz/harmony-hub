import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Sliders,
  ChevronDown,
  Sparkles,
  Loader2,
  Disc3,
  Shuffle,
  Repeat,
  X,
  Radio,
  Layers,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration, type Track } from "@/domain/music/types";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FullscreenAudiophilePlayerProps {
  open: boolean;
  onClose: () => void;
}

export function FullscreenAudiophilePlayer({ open, onClose }: FullscreenAudiophilePlayerProps) {
  const {
    currentTrack,
    status,
    isPlaying,
    progress,
    volume,
    currentTime,
    duration,
    queue,
    queueIndex,
    eqEnabled,
    eqPreset,
    bassBoostLevel,
    normalizerEnabled,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
    seek,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    getAnalyserNode,
  } = usePlayer();

  const { isOffline } = useAppMode();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live FFT spectrum visualizer
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        const barCount = 28;
        const barWidth = width / barCount - 1.5;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i * step] || 0;
          const barHeight = (val / 255) * height;
          const x = i * (barWidth + 1.5);
          const y = height - barHeight;

          // Gradient color inspired by Astell&Kern / Apple Music amber-emerald glow
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          if (isOffline) {
            grad.addColorStop(0, "rgba(16, 185, 129, 0.4)");
            grad.addColorStop(1, "rgba(52, 211, 153, 0.95)");
          } else {
            grad.addColorStop(0, "rgba(255, 122, 24, 0.4)");
            grad.addColorStop(1, "rgba(251, 146, 60, 0.95)");
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      }
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [open, isPlaying, isOffline, getAnalyserNode]);

  if (!open || !currentTrack) return null;

  const localMeta = currentTrack as LocalTrack;

  // Format high-res specs
  const sampleRateKhz = currentTrack.sampleRate
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : "44.1 kHz";

  const bitDepthLabel = currentTrack.bitDepth ? `${currentTrack.bitDepth}-bit` : "16-bit";
  const bitrateLabel = currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : "1411 kbps";
  const formatLabel = currentTrack.format || currentTrack.quality || "FLAC";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden select-none"
      >
        {/* Subtle Ambient Background Artwork Glow */}
        <div
          className="absolute inset-0 opacity-15 blur-[120px] pointer-events-none scale-125"
          style={{
            backgroundImage: `url(${currentTrack.coverImage})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />

        {/* ── Top Device Bar ── */}
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Minimize Player"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised cursor-pointer transition-transform active:scale-95"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>

          {/* Symmetrical High-Resolution Hardware Deck Header */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.2em] text-muted-foreground/80">
              {isOffline ? "LAYAM HI-FI AUDIO SYSTEM" : "LAYAM DSD STUDIO DECK"}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
                  isOffline
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-primary/40 text-primary bg-primary/10",
                )}
              >
                {formatLabel} · {bitDepthLabel} / {sampleRateKhz} · {bitrateLabel}
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQueueDrawerOpen(true)}
            aria-label="Open Queue"
            className="relative h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised cursor-pointer transition-transform active:scale-95"
          >
            <ListMusic className="h-5 w-5" />
            {queue.length > 1 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {queue.length}
              </span>
            )}
          </Button>
        </header>

        {/* ── Main Centered Audiophile Player Body ── */}
        <main className="relative z-10 mx-auto flex flex-1 w-full max-w-xl flex-col items-center justify-center px-6 py-2 overflow-y-auto">
          {/* Large Centered Artwork Frame with Vinyl Aesthetics */}
          <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] shrink-0 overflow-hidden rounded-3xl bg-surface-raised shadow-[0_24px_70px_rgba(0,0,0,0.9)] border border-white/10 group mb-6">
            <img
              src={currentTrack.coverImage}
              alt={currentTrack.title}
              className={cn(
                "h-full w-full object-cover transition-transform duration-700 ease-out",
                isPlaying ? "scale-100" : "scale-[0.98] opacity-90",
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-50 pointer-events-none" />

            {/* Micro Live Spectrum Visualizer Bar at Artwork Base */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <canvas
                ref={canvasRef}
                width={140}
                height={26}
                className="h-6 w-32 rounded opacity-90"
              />
              <span className="text-[10px] font-mono font-bold text-white/90 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
                BIT-PERFECT
              </span>
            </div>
          </div>

          {/* Symmetrical Track Typography & Information */}
          <div className="w-full text-center mb-5 px-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {currentTrack.title}
            </h1>
            <p className="text-base sm:text-lg font-medium text-muted-foreground mt-1 truncate">
              {currentTrack.artistName || currentTrack.artist || "Artist"}
            </p>
            {localMeta.album && (
              <p className="text-xs font-mono text-muted-foreground/70 mt-1 truncate">
                {localMeta.album}
              </p>
            )}
          </div>

          {/* Elegant Waveform Scrubber & Exact Monospace Progress */}
          <div className="w-full space-y-2 mb-6">
            <div className="h-7 w-full px-1">
              <Waveform
                seed={currentTrack.id}
                peaks={currentTrack.waveform}
                progress={progress}
                onSeek={seek}
                className="h-7 w-full"
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-muted-foreground tabular-nums px-2">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Symmetrical Tactile Hardware Playback Controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffle((s) => !s)}
              className={cn(
                "h-10 w-10 rounded-full transition-colors",
                isShuffle
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised cursor-pointer transition-transform active:scale-90"
              aria-label="Previous track"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </Button>

            <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
              <Button
                size="icon"
                onClick={togglePlay}
                className={cn(
                  "h-18 w-18 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-white/20 transition-all cursor-pointer",
                  isOffline
                    ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30",
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {status === "loading" || status === "buffering" ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-9 w-9 fill-current" />
                ) : (
                  <Play className="h-9 w-9 fill-current ml-1" />
                )}
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              onClick={playNext}
              className="h-12 w-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-raised cursor-pointer transition-transform active:scale-90"
              aria-label="Next track"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRepeat((r) => !r)}
              className={cn(
                "h-10 w-10 rounded-full transition-colors",
                isRepeat
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Repeat"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Symmetrical Dedicated Audiophile Console Dock (EQ, DSP, Queue) ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full rounded-2xl border border-border/40 bg-surface/80 backdrop-blur-md p-2.5 mb-5 text-xs font-mono">
            {/* EQ Button */}
            <button
              onClick={() => setConsoleOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all cursor-pointer",
                eqEnabled
                  ? isOffline
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold"
                    : "border-primary/50 bg-primary/15 text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                EQUALIZER
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <Sliders className="h-3.5 w-3.5" />
                <span>{eqEnabled ? eqPreset : "BYPASS"}</span>
              </div>
            </button>

            {/* DSP Console Button */}
            <button
              onClick={() => setConsoleOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all cursor-pointer border-x border-border/30",
                bassBoostLevel > 0 || normalizerEnabled
                  ? "border-primary/50 bg-primary/15 text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                DSP AUDIO
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <Layers className="h-3.5 w-3.5" />
                <span>{bassBoostLevel > 0 ? `+${bassBoostLevel}dB BASS` : "STUDIO"}</span>
              </div>
            </button>

            {/* Queue Button */}
            <button
              onClick={() => setQueueDrawerOpen(true)}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-all cursor-pointer"
            >
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                UP NEXT
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <ListMusic className="h-3.5 w-3.5" />
                <span>{queue.length} TRACKS</span>
              </div>
            </button>
          </div>

          {/* Precision Volume Hardware Control */}
          <div className="flex items-center gap-3 w-full max-w-sm px-2 pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume(val / 100)}
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </main>

        {/* ── Slide-Over Up Next Queue Drawer ── */}
        <AnimatePresence>
          {queueDrawerOpen && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col p-6"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Playback Queue</h3>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {queue.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQueue}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQueueDrawerOpen(false)}
                    className="h-8 w-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto divide-y divide-border/20 py-2">
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-xl transition-colors cursor-pointer group",
                      i === queueIndex ? "bg-primary/10 text-primary" : "hover:bg-surface-raised",
                    )}
                    onClick={() => playFromQueue(i)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={track.coverImage}
                        alt={track.title}
                        className="h-10 w-10 rounded-lg object-cover border border-border/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs font-bold truncate",
                            i === queueIndex && "text-primary",
                          )}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {track.artistName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDuration(track.duration)}
                      </span>
                      {queue.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(i);
                          }}
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Studio Audio Console Modal */}
        <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />
      </motion.div>
    </AnimatePresence>
  );
}
