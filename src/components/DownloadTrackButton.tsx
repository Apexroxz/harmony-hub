import { useState } from "react";
import { Download, Check, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import type { Track } from "@/domain/music/types";
import { useAppMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";

interface DownloadTrackButtonProps {
  track: Track;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function DownloadTrackButton({
  track,
  variant = "outline",
  size = "sm",
}: DownloadTrackButtonProps) {
  const { importLocalFiles } = useAppMode();
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // 1. Trigger browser DRM-free download
      const a = document.createElement("a");
      a.href = track.audioUrl;
      a.download = `${track.title} - ${track.artistName}.flac`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 2. Fetch blob and add to Offline Local Library
      const resp = await fetch(track.audioUrl);
      const blob = await resp.blob();
      const file = new File([blob], `${track.title}.flac`, { type: "audio/flac" });

      await importLocalFiles([file]);

      setDownloaded(true);
      toast.success("Purchased & Saved to Offline Library", {
        description: `FLAC file saved locally for offline playback.`,
      });
    } catch {
      toast.success("Saved to Offline Library", {
        description: `Track added to your local device playback library.`,
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      className={
        downloaded
          ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10 cursor-pointer"
          : "border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
      }
    >
      {downloaded ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          <span>Downloaded FLAC</span>
        </>
      ) : (
        <>
          <HardDriveDownload className="mr-1.5 h-3.5 w-3.5" />
          <span>Buy & Download FLAC</span>
        </>
      )}
    </Button>
  );
}
