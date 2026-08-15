import {
  Keyboard,
  Play,
  Volume2,
  Sliders,
  Maximize2,
  Music2,
  Cpu,
  Search,
  Compass,
  Command,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  icon: typeof Play;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Playback & Navigation",
    icon: Play,
    items: [
      { keys: ["Space"], description: "Play / Pause playback" },
      { keys: ["←", "→"], description: "Seek backward / forward 5s" },
      { keys: ["Shift", "←"], description: "Previous track" },
      { keys: ["Shift", "→"], description: "Next track" },
      { keys: ["↑", "↓"], description: "Volume up / down 5%" },
      { keys: ["M"], description: "Mute / Unmute audio" },
    ],
  },
  {
    title: "DSP & Audio Hardware",
    icon: Sliders,
    items: [
      { keys: ["E"], description: "Open 10-Band EQ & Audio Console" },
      { keys: ["D"], description: "Open Hardware DAC & Output Switcher" },
      { keys: ["F"], description: "Toggle Fullscreen Audiophile Visualizer" },
      { keys: ["L"], description: "Toggle Synchronized Lyrics" },
      { keys: ["Q"], description: "Toggle Play Queue Drawer" },
    ],
  },
  {
    title: "Global Commands",
    icon: Command,
    items: [
      { keys: ["/"], description: "Quick Search masters & creators" },
      { keys: ["?"], description: "Open this Keyboard Shortcuts HUD" },
      { keys: ["Esc"], description: "Close any active modal or drawer" },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
              <Keyboard className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Universal Keyboard Hotkeys</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  POWER USER HUD
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control playback, DSP processing, and visualizer views with direct keyboard strokes.
              </p>
            </div>
          </div>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {SHORTCUT_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{section.title}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl border border-border/40 bg-surface-raised/70 text-xs"
                    >
                      <span className="text-muted-foreground font-medium truncate pr-2">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-border/80 bg-card px-2 font-mono text-[11px] font-extrabold text-foreground shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 p-4 bg-surface-raised/80 text-xs text-muted-foreground">
          <span className="font-mono text-[11px]">
            Press <kbd className="font-bold text-foreground bg-card px-1.5 py-0.5 rounded border border-border/60">?</kbd> anywhere to trigger this HUD
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-5 cursor-pointer"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
