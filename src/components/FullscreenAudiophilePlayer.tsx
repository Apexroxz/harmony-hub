import { useState, useRef, useEffect, useMemo } from "react";
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
  Layers,
  Flame,
  Radio,
  FileText,
  Music,
  Upload,
} from "lucide-react";
import { usePlayer } from "@/lib/player";
import { useAppMode, type LocalTrack } from "@/lib/mode";
import { formatDuration, type Track } from "@/domain/music/types";
import { Waveform } from "@/components/Waveform";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LocalLyricsService, type StoredTrackLyrics } from "@layam/storage-core";

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
    openConsole,
    toggleConsole,
  } = usePlayer();

  const { isOffline } = useAppMode();
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [viewMode, setViewMode] = useState<"artwork" | "lyrics">("artwork");
  const [lyricsData, setLyricsData] = useState<StoredTrackLyrics | null>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load lyrics when currentTrack changes
  useEffect(() => {
    if (currentTrack?.id) {
      LocalLyricsService.getLyrics(currentTrack.id).then(setLyricsData);
    } else {
      setLyricsData(null);
    }
  }, [currentTrack?.id]);

  // Compute active lyric line index
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData || !lyricsData.lines || lyricsData.lines.length === 0) return -1;
    const currentMs = (currentTime || 0) * 1000;
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      if (lyricsData.lines[i].timeMs <= currentMs) {
        return i;
      }
    }
    return 0;
  }, [lyricsData, currentTime]);

  // Auto-scroll lyrics smoothly
  useEffect(() => {
    if (viewMode === "lyrics" && activeLyricIndex >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [viewMode, activeLyricIndex]);

  const handleImportLyricsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentTrack) {
      try {
        const imported = await LocalLyricsService.importLyricsFromFile(
          currentTrack.id,
          currentTrack.title,
          currentTrack.artistName,
          file
        );
        setLyricsData(imported);
      } catch (err) {
        console.warn("[LyricsImportError]", err);
      }
    }
    e.target.value = "";
  };

  // Live FFT spectrum visualizer loop
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

          // Layam metallic gold gradient
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, "rgba(179, 122, 26, 0.35)");
          grad.addColorStop(0.6, "rgba(217, 154, 43, 0.85)");
          grad.addColorStop(1, "rgba(245, 184, 76, 1)");

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
  }, [open, isPlaying, getAnalyserNode]);

  if (!open || !currentTrack) return null;

  const localMeta = currentTrack as LocalTrack;

  // Format high-res specs
  const sampleRateKhz = currentTrack.sampleRate
    ? currentTrack.sampleRate >= 1000
      ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz`
      : `${currentTrack.sampleRate} Hz`
    : "96.0 kHz";

  const bitDepthLabel = currentTrack.bitDepth ? `${currentTrack.bitDepth}-BIT` : "24-BIT";
  const bitrateLabel = currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : "LOSSLESS";
  const formatLabel = currentTrack.format || currentTrack.quality || "FLAC";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#08090B] text-[#f2f3f5] overflow-hidden select-none"
      >
        {/* Subtle Ambient Background Artwork Glow */}
        <div
          className="absolute inset-0 opacity-15 blur-[120px] pointer-events-none scale-125"
          style={{
            backgroundImage: `url(${currentTrack.coverImage || ""})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />

        {/* ── Top Device Bar ── */}
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 border-b border-white/[0.06]">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Minimize Player"
            className="h-10 w-10 rounded-xl border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40 cursor-pointer transition-transform active:scale-95"
            title="Minimize Player (Esc)"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>

          {/* Symmetrical High-Resolution Hardware Deck Header */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.2em] text-[#D99A2B]">
              LAYAM HI-FI AUDIOPHILE COCKPIT
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#D99A2B]/35 text-[#D99A2B] bg-[#D99A2B]/10 shadow-sm"
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
            className="relative h-10 w-10 rounded-xl border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40 cursor-pointer transition-transform active:scale-95"
            title="Master Play Queue"
          >
            <ListMusic className="h-5 w-5" />
            {queue.length > 1 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#D99A2B] text-[9px] font-mono font-extrabold text-[#08090B]">
                {queue.length}
              </span>
            )}
          </Button>
        </header>

        {/* ── Main Centered Audiophile Player Body ── */}
        <main className="relative z-10 mx-auto flex flex-1 w-full max-w-xl flex-col items-center justify-center px-6 py-2 overflow-y-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#0D0E12] p-1 rounded-xl border border-white/[0.08] mb-4">
            <button
              onClick={() => setViewMode("artwork")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer",
                viewMode === "artwork"
                  ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/40 shadow-sm"
                  : "text-[#9ba1ad] hover:text-[#f2f3f5]"
              )}
            >
              <Disc3 className="h-3.5 w-3.5" />
              <span>Artwork & Spectrum</span>
            </button>
            <button
              onClick={() => setViewMode("lyrics")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer",
                viewMode === "lyrics"
                  ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/40 shadow-sm"
                  : "text-[#9ba1ad] hover:text-[#f2f3f5]"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Lyrics</span>
            </button>
          </div>

          {/* Hidden Lyrics File Input */}
          <input
            type="file"
            ref={lyricsFileInputRef}
            onChange={handleImportLyricsFile}
            accept=".lrc,.txt,.srt"
            className="hidden"
          />

          {viewMode === "artwork" ? (
            /* Large Centered Artwork Frame with Hardware Aesthetics */
            <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] shrink-0 overflow-hidden rounded-3xl bg-[#0D0E12] shadow-[0_30px_90px_rgba(0,0,0,0.98)] border border-[#D99A2B]/25 group mb-6">
              <img
                src={currentTrack.coverImage || "/placeholder.svg"}
                alt={currentTrack.title}
                className={cn(
                  "h-full w-full object-cover transition-transform duration-700 ease-out",
                  isPlaying ? "scale-100" : "scale-[0.98] opacity-90"
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08090B]/90 via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Micro Live Spectrum Visualizer Bar at Artwork Base */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <canvas
                  ref={canvasRef}
                  width={140}
                  height={26}
                  className="h-6 w-32 rounded opacity-90"
                />
                <span className="text-[10px] font-mono font-bold text-[#D99A2B] bg-[#08090B]/90 px-2.5 py-0.5 rounded border border-[#D99A2B]/35 shadow-sm">
                  64-BIT PCM DIRECT
                </span>
              </div>
            </div>
          ) : (
            /* Synchronized Lyrics Container */
            <div className="relative w-full max-w-[420px] h-[280px] sm:h-[340px] md:h-[380px] shrink-0 overflow-hidden rounded-3xl bg-[#0D0E12] shadow-inner border border-white/[0.08] p-5 mb-6 flex flex-col">
              {lyricsData && lyricsData.lines && lyricsData.lines.length > 0 ? (
                <div
                  ref={lyricsContainerRef}
                  className="flex-1 overflow-y-auto space-y-4 text-center py-12 px-2 scroll-smooth"
                >
                  {lyricsData.lines.map((line, idx) => {
                    const isActive = activeLyricIndex === idx;
                    return (
                      <p
                        key={idx}
                        onClick={() => {
                          if (duration && duration > 0) {
                            seek(line.timeMs / 1000 / duration);
                          }
                        }}
                        className={cn(
                          "transition-all duration-300 cursor-pointer font-sans select-none",
                          isActive
                            ? "text-[#D99A2B] text-lg sm:text-xl font-extrabold scale-105 drop-shadow-[0_0_12px_rgba(217,154,43,0.4)]"
                            : "text-[#9ba1ad]/60 hover:text-[#f2f3f5] text-sm sm:text-base font-medium"
                        )}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <FileText className="h-10 w-10 text-[#9ba1ad]/40 mb-3" />
                  <p className="text-sm font-semibold text-[#f2f3f5]">No Synced Lyrics in Local Vault</p>
                  <p className="text-xs text-[#9ba1ad] mt-1 max-w-xs leading-relaxed">
                    Import a .LRC sidecar file or enable online metadata in Settings.
                  </p>
                  <button
                    onClick={() => lyricsFileInputRef.current?.click()}
                    className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D99A2B]/15 hover:bg-[#D99A2B]/25 text-[#D99A2B] border border-[#D99A2B]/30 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import .LRC File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Symmetrical Track Typography & Information */}
          <div className="w-full text-center mb-5 px-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#f2f3f5] truncate">
              {currentTrack.title}
            </h1>
            <p className="text-base sm:text-lg font-medium text-[#9ba1ad] mt-1 truncate">
              {currentTrack.artistName || "Unknown Artist"}
            </p>
            {localMeta.album && (
              <p className="text-xs font-mono text-[#D99A2B]/80 mt-1 truncate">
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
            <div className="flex justify-between text-xs font-mono text-[#9ba1ad] tabular-nums px-2">
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
                "h-10 w-10 rounded-xl border border-white/[0.08] transition-colors cursor-pointer",
                isShuffle
                  ? "text-[#08090B] bg-[#D99A2B] border-[#f5b84c]"
                  : "text-[#9ba1ad] bg-[#0D0E12] hover:text-[#f2f3f5]"
              )}
              aria-label="Shuffle"
              title="Shuffle Playback"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              className="h-12 w-12 rounded-2xl border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40 cursor-pointer transition-transform active:scale-90"
              aria-label="Previous track"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </Button>

            <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
              <Button
                size="icon"
                onClick={togglePlay}
                className="h-18 w-18 rounded-3xl shadow-[0_0_30px_rgba(217,154,43,0.45)] bg-gradient-to-b from-[#f5b84c] via-[#D99A2B] to-[#b37a1a] text-[#08090B] hover:brightness-110 active:brightness-95 border border-[#fbd38d]/60 transition-all cursor-pointer"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {status === "loading" || status === "buffering" ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#08090B]" />
                ) : isPlaying ? (
                  <Pause className="h-9 w-9 fill-current text-[#08090B]" />
                ) : (
                  <Play className="h-9 w-9 fill-current ml-1 text-[#08090B]" />
                )}
              </Button>
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              onClick={playNext}
              className="h-12 w-12 rounded-2xl border border-white/[0.08] bg-[#0D0E12] text-[#9ba1ad] hover:text-[#f2f3f5] hover:border-[#D99A2B]/40 cursor-pointer transition-transform active:scale-90"
              aria-label="Next track"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRepeat((r) => !r)}
              className={cn(
                "h-10 w-10 rounded-xl border border-white/[0.08] transition-colors cursor-pointer",
                isRepeat
                  ? "text-[#08090B] bg-[#D99A2B] border-[#f5b84c]"
                  : "text-[#9ba1ad] bg-[#0D0E12] hover:text-[#f2f3f5]"
              )}
              aria-label="Repeat"
              title="Repeat Track"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Symmetrical Dedicated Audiophile Console Dock (EQ, DSP, Queue) ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full rounded-2xl border border-white/[0.08] bg-[#0D0E12] p-2.5 mb-5 text-xs font-mono">
            {/* EQ Button */}
            <button
              onClick={openConsole}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all cursor-pointer",
                eqEnabled
                  ? "border-[#D99A2B]/60 bg-[#D99A2B]/15 text-[#D99A2B] font-bold shadow-sm"
                  : "border-transparent text-[#9ba1ad] hover:bg-[#14161C] hover:text-[#f2f3f5]"
              )}
            >
              <span className="text-[9px] uppercase tracking-wider text-[#9ba1ad] font-semibold">
                EQUALIZER
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <Sliders className="h-3.5 w-3.5 text-[#D99A2B]" />
                <span>{eqEnabled ? eqPreset : "BYPASS"}</span>
              </div>
            </button>

            {/* DSP Console Button */}
            <button
              onClick={openConsole}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all cursor-pointer border-x border-white/[0.08]",
                bassBoostLevel > 0 || normalizerEnabled
                  ? "border-[#D99A2B]/60 bg-[#D99A2B]/15 text-[#D99A2B] font-bold shadow-sm"
                  : "border-transparent text-[#9ba1ad] hover:bg-[#14161C] hover:text-[#f2f3f5]"
              )}
            >
              <span className="text-[9px] uppercase tracking-wider text-[#9ba1ad] font-semibold">
                DSP HARDWARE
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <Layers className="h-3.5 w-3.5 text-[#D99A2B]" />
                <span>{bassBoostLevel > 0 ? `+${bassBoostLevel}dB BASS` : "STUDIO"}</span>
              </div>
            </button>

            {/* Queue Button */}
            <button
              onClick={() => setQueueDrawerOpen(true)}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border border-transparent text-[#9ba1ad] hover:bg-[#14161C] hover:text-[#f2f3f5] transition-all cursor-pointer"
            >
              <span className="text-[9px] uppercase tracking-wider text-[#9ba1ad] font-semibold">
                UP NEXT
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 font-bold text-xs">
                <ListMusic className="h-3.5 w-3.5 text-[#D99A2B]" />
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
              className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#D99A2B]" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume((val ?? 0) / 100)}
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-[10px] text-[#9ba1ad] tabular-nums">
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
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/[0.08] bg-[#08090B] shadow-2xl flex flex-col p-6"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-5 w-5 text-[#D99A2B]" />
                  <h3 className="text-base font-bold font-mono uppercase tracking-wider text-[#f2f3f5]">
                    Master Play Queue
                  </h3>
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs bg-[#0D0E12] border border-[#D99A2B]/30 text-[#D99A2B]"
                  >
                    {queue.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearQueue}
                      className="h-8 text-xs font-mono text-[#9ba1ad] hover:text-red-400"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQueueDrawerOpen(false)}
                    className="h-8 w-8 rounded-lg text-[#9ba1ad] hover:text-[#f2f3f5]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto divide-y divide-white/[0.04] py-2">
                {queue.map((track, i) => (
                  <li
                    key={`${track.id}-${i}`}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-xl transition-colors cursor-pointer group",
                      i === queueIndex
                        ? "bg-[#14161C] border border-[#D99A2B]/40 text-[#D99A2B]"
                        : "hover:bg-[#0D0E12]"
                    )}
                    onClick={() => playFromQueue(i)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={track.coverImage || "/placeholder.svg"}
                        alt={track.title}
                        className="h-10 w-10 rounded-lg object-cover border border-white/[0.08]"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs font-bold truncate",
                            i === queueIndex ? "text-[#D99A2B]" : "text-[#f2f3f5]"
                          )}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#9ba1ad] truncate">
                          {track.artistName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#9ba1ad]">
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
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-md text-[#9ba1ad] hover:text-[#f2f3f5]"
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
      </motion.div>
    </AnimatePresence>
  );
}

export default FullscreenAudiophilePlayer;
