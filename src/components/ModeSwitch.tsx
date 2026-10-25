import { motion } from "framer-motion";
import { Globe, HardDrive } from "lucide-react";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

export function ModeSwitch() {
  const { isOffline, setMode } = useAppMode();

  return (
    <div
      role="radiogroup"
      aria-label="Audio Playback Mode"
      className="relative inline-flex items-center rounded-full p-1 bg-black/60 border border-white/10 backdrop-blur-2xl shadow-inner select-none"
    >
      {/* Online Music Option */}
      <button
        type="button"
        role="radio"
        aria-checked={!isOffline}
        onClick={() => setMode("online")}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 cursor-pointer",
          !isOffline
            ? "text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {!isOffline && (
          <motion.div
            layoutId="mode-switch-active-thumb"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute inset-0 rounded-full bg-white/[0.14] border border-white/25 shadow-[0_0_12px_rgba(255,255,255,0.12)]"
          />
        )}
        <Globe className={cn("relative z-10 h-3.5 w-3.5 transition-colors", !isOffline ? "text-primary" : "text-muted-foreground")} />
        <span className="relative z-10 font-mono text-[11px]">Online</span>
      </button>

      {/* Offline Hi-Fi Option */}
      <button
        type="button"
        role="radio"
        aria-checked={isOffline}
        onClick={() => setMode("offline")}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 cursor-pointer",
          isOffline
            ? "text-emerald-300"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {isOffline && (
          <motion.div
            layoutId="mode-switch-active-thumb"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute inset-0 rounded-full bg-emerald-950/80 border border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.3)]"
          />
        )}
        <HardDrive className={cn("relative z-10 h-3.5 w-3.5 transition-colors", isOffline ? "text-emerald-400" : "text-muted-foreground")} />
        <span className="relative z-10 font-mono text-[11px]">Offline</span>
      </button>
    </div>
  );
}
