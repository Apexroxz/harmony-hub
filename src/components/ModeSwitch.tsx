import { motion } from "framer-motion";
import { Wifi, WifiOff, Headphones, Globe2 } from "lucide-react";
import { useAppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

export function ModeSwitch() {
  const { isOffline, toggleMode } = useAppMode();

  return (
    <div
      role="switch"
      aria-checked={isOffline}
      aria-label="Toggle Online and Offline Hi-Fi mode"
      onClick={toggleMode}
      className={cn(
        "relative flex h-8 items-center rounded-full p-1 cursor-pointer select-none transition-colors border shadow-inner",
        isOffline
          ? "border-emerald-500/40 bg-emerald-950/60"
          : "border-border/60 bg-surface-raised/80"
      )}
    >
      {/* Background Mode Labels */}
      <div className="flex items-center text-[10px] font-extrabold tracking-wider uppercase px-1 gap-2.5 z-0">
        <span
          className={cn(
            "flex items-center gap-1 transition-colors pl-1",
            !isOffline ? "text-primary font-bold" : "text-muted-foreground/60"
          )}
        >
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">Online</span>
        </span>

        <span
          className={cn(
            "flex items-center gap-1 transition-colors pr-1",
            isOffline ? "text-emerald-400 font-bold" : "text-muted-foreground/60"
          )}
        >
          <Headphones className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      </div>

      {/* Sliding Switch Thumb Indicator */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className={cn(
          "absolute top-0.5 bottom-0.5 flex items-center justify-center rounded-full px-2.5 shadow-md text-[10px] font-extrabold gap-1 border",
          isOffline
            ? "right-0.5 bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            : "left-0.5 bg-primary text-primary-foreground border-primary/40 shadow-[0_0_12px_var(--color-glow-soft)]"
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-3 w-3" />
            <span className="hidden xs:inline">Offline</span>
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            <span className="hidden xs:inline">Online</span>
          </>
        )}
      </motion.div>
    </div>
  );
}
