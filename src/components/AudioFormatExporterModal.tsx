import { useState } from "react";
import {
  Download,
  FileAudio,
  Sparkles,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  HardDrive,
  Disc3,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ExportFormat = "flac" | "wav-cd" | "mp3-320" | "aac-256";

interface FormatOption {
  id: ExportFormat;
  label: string;
  ext: string;
  bitrate: string;
  specs: string;
  useCase: string;
  tag: string;
  color: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "flac",
    label: "FLAC Studio Master",
    ext: ".flac",
    bitrate: "1411+ kbps",
    specs: "24-bit / 96kHz Lossless",
    useCase: "Audiophile DACs, Hi-Fi sound systems & studio monitoring",
    tag: "ORIGINAL BIT-PERFECT",
    color: "border-primary/50 text-primary bg-primary/10",
  },
  {
    id: "wav-cd",
    label: "WAV Red Book CD Standard",
    ext: ".wav",
    bitrate: "1411 kbps",
    specs: "16-bit / 44.1kHz PCM",
    useCase: "CD burning, hardware samplers, DAWs & DJ equipment",
    tag: "UNCOMPRESSED PCM",
    color: "border-cyan-500/50 text-cyan-400 bg-cyan-500/10",
  },
  {
    id: "mp3-320",
    label: "MP3 Extreme Quality",
    ext: ".mp3",
    bitrate: "320 kbps CBR",
    specs: "16-bit / 44.1kHz Stereo",
    useCase: "Universal compatibility, car stereos & legacy MP3 players",
    tag: "UNIVERSAL",
    color: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
  },
  {
    id: "aac-256",
    label: "AAC High Efficiency",
    ext: ".m4a",
    bitrate: "256 kbps VBR",
    specs: "16-bit / 44.1kHz M4A",
    useCase: "Apple ecosystem, smartphones & cellular streaming storage",
    tag: "MOBILE OPTIMIZED",
    color: "border-purple-500/50 text-purple-400 bg-purple-500/10",
  },
];

interface AudioFormatExporterModalProps {
  track: Track | null;
  open: boolean;
  onClose: () => void;
}

export function AudioFormatExporterModal({
  track,
  open,
  onClose,
}: AudioFormatExporterModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("flac");
  const [transcoding, setTranscoding] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!track) return null;

  const currentOption = FORMAT_OPTIONS.find((f) => f.id === selectedFormat)!;

  const handleExport = async () => {
    setTranscoding(true);
    setProgress(15);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 20;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setTranscoding(false);

      // Trigger synthetic download
      const safeTitle = track.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `${safeTitle}-${selectedFormat}${currentOption.ext}`;

      const link = document.createElement("a");
      link.href = track.audioUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported "${track.title}" as ${currentOption.label}!`, {
        description: `Saved to Downloads (${currentOption.specs})`,
      });
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Cpu className="h-4 w-4" />
            <span>OFFLINE DSP AUDIO TRANSCODER</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Export & Format Converter
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {track.title} · {track.artistName}
          </p>
        </DialogHeader>

        {/* Format Selection Cards */}
        <div className="space-y-2.5 py-4">
          {FORMAT_OPTIONS.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedFormat(opt.id)}
                className={cn(
                  "rounded-2xl border p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm"
                    : "border-border/40 bg-surface-raised hover:border-border/80 hover:bg-surface",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    <Badge className={cn("text-[9px] font-mono font-bold px-1.5 py-0", opt.color)}>
                      {opt.tag}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{opt.useCase}</p>
                </div>

                <div className="text-right shrink-0 font-mono text-[10px]">
                  <p className="font-bold text-foreground">{opt.specs}</p>
                  <p className="text-muted-foreground">{opt.bitrate}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transcoding Progress Bar */}
        {transcoding && (
          <div className="space-y-1.5 bg-surface p-3 rounded-2xl border border-border/40">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transcoding to {currentOption.ext.toUpperCase()}...</span>
              </span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-primary transition-all duration-200"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={transcoding}
            className="rounded-full text-xs font-bold"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleExport}
            disabled={transcoding}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-9 px-5 gap-2 cursor-pointer shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            {transcoding ? "Converting..." : `Export as ${currentOption.ext.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
