import { useState, useRef, useEffect } from "react";
import { Mic2, Upload, Music } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { parseLrc, generateSampleLrc, type LrcLine } from "@/lib/lrcParser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function LyricsModal() {
  const [open, setOpen] = useState(false);
  const { currentTrack, currentTime } = usePlayer();
  const [customLrcMap, setCustomLrcMap] = useState<Record<string, LrcLine[]>>({});
  const lrcInputRef = useRef<HTMLInputElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  if (!currentTrack) return null;

  const activeLyrics: LrcLine[] =
    customLrcMap[currentTrack.id] ||
    generateSampleLrc(currentTrack.title, currentTrack.artistName, currentTrack.duration);

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < activeLyrics.length; i++) {
    const line = activeLyrics[i];
    if (line && line.time <= currentTime) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Auto-scroll to active line
  useEffect(() => {
    if (open && activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, open]);

  const handleLrcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const parsed = parseLrc(text);
          setCustomLrcMap((prev) => ({
            ...prev,
            [currentTrack.id]: parsed,
          }));
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="View Lyrics"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Mic2 className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Mic2 className="h-5 w-5 text-primary" />
              <span>Synchronized LRC Lyrics</span>
            </DialogTitle>

            <input
              type="file"
              ref={lrcInputRef}
              accept=".lrc,.txt"
              onChange={handleLrcUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => lrcInputRef.current?.click()}
              className="h-7 text-xs border-border/60 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-primary" />
              Upload .lrc
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentTrack.title} — {currentTrack.artistName}
          </p>
        </DialogHeader>

        {/* Lyrics Container */}
        <div
          ref={containerRef}
          className="my-4 max-h-[50vh] min-h-[300px] overflow-y-auto space-y-4 rounded-2xl border border-border/50 bg-card p-6 text-center shadow-inner"
        >
          {activeLyrics.map((line, index) => {
            const isActive = index === activeIndex;
            return (
              <p
                key={`${line.time}-${index}`}
                ref={(el) => {
                  lineRefs.current[index] = el;
                }}
                className={cn(
                  "transition-all duration-300 font-semibold cursor-pointer px-3 py-1.5 rounded-xl text-base sm:text-lg",
                  isActive
                    ? "text-primary bg-primary/10 scale-105 shadow-[0_0_15px_var(--color-glow-soft)]"
                    : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
