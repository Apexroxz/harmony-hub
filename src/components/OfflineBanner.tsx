import { HardDrive } from "lucide-react";
import { useAppMode } from "@/lib/mode";

export function OfflineBanner() {
  const { isOffline } = useAppMode();
  if (!isOffline) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 flex items-center justify-center gap-2 py-1.5 text-[11px] font-medium text-amber-400/80 bg-amber-500/6 border-b border-amber-500/15 backdrop-blur-sm">
      <HardDrive className="h-3 w-3" />
      <span>Offline Mode — playing local audio files</span>
    </div>
  );
}
