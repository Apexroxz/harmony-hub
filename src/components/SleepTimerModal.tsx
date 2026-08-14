import { useState } from "react";
import { Timer, Clock, Check } from "lucide-react";
import { usePlayer, type SleepTimerOption } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export function SleepTimerModal() {
  const [open, setOpen] = useState(false);
  const { sleepTimerOption, sleepTimerRemaining, setSleepTimer } = usePlayer();

  const options: { label: string; value: SleepTimerOption }[] = [
    { label: "15 Minutes", value: "15" },
    { label: "30 Minutes", value: "30" },
    { label: "45 Minutes", value: "45" },
    { label: "60 Minutes", value: "60" },
    { label: "End of Current Track", value: "end_of_track" },
    { label: "Off (Cancel Timer)", value: null },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sleep Timer"
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer relative",
            sleepTimerOption && "text-amber-400"
          )}
        >
          <Timer className="h-4 w-4" />
          {sleepTimerOption && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Timer className="h-5 w-5 text-amber-400" />
            <span>Sleep Timer</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Automatically stop audio playback after a specified time.
          </p>
        </DialogHeader>

        {/* Active Countdown Indicator */}
        {sleepTimerOption && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400 animate-spin" />
              <span className="text-xs font-semibold">Sleep Timer Active</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-300">
              {sleepTimerOption === "end_of_track"
                ? "End of Track"
                : sleepTimerRemaining !== null
                ? formatSeconds(sleepTimerRemaining)
                : "Active"}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = sleepTimerOption === opt.value;
            return (
              <button
                key={opt.value ?? "off"}
                onClick={() => {
                  setSleepTimer(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border p-3.5 text-sm font-medium transition-all cursor-pointer",
                  isSelected
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "border-border/50 bg-surface-raised text-foreground hover:bg-card"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
