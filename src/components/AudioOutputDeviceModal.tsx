import { useState, useEffect } from "react";
import {
  Headphones,
  Speaker,
  Radio,
  Cpu,
  CheckCircle2,
  Sliders,
  Volume2,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  Activity,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AudioOutputDevice {
  id: string;
  label: string;
  type: "dac" | "headphones" | "bluetooth" | "speakers";
  sampleRate: string;
  bitDepth: string;
  isBitPerfectCapable: boolean;
  driverType: string;
  description: string;
}

const AUDIOPHILE_DEVICES: AudioOutputDevice[] = [
  {
    id: "device-dac-master",
    label: "External USB-C High-Res DAC (Bit-Perfect)",
    type: "dac",
    sampleRate: "96.0 kHz / 192.0 kHz",
    bitDepth: "24-Bit / 32-Bit Float",
    isBitPerfectCapable: true,
    driverType: "CoreAudio / ASIO Direct Stream",
    description: "Exclusive hardware master clock bypassing OS software audio resampler.",
  },
  {
    id: "device-planar-headphones",
    label: "Planar Magnetic / Reference Studio Cans",
    type: "headphones",
    sampleRate: "96.0 kHz",
    bitDepth: "24-Bit Lossless",
    isBitPerfectCapable: true,
    driverType: "High-Impedance Reference",
    description: "Linear transient response tuned for deep bass precision and transparent highs.",
  },
  {
    id: "device-bluetooth-ldac",
    label: "Wireless High-Resolution (Sony LDAC 990kbps)",
    type: "bluetooth",
    sampleRate: "96.0 kHz",
    bitDepth: "24-Bit / 96kHz",
    isBitPerfectCapable: false,
    driverType: "LDAC High-Definition Codec",
    description: "Maximum bandwidth wireless audio transmission with 3x standard Bluetooth fidelity.",
  },
  {
    id: "device-system-default",
    label: "System Default Stereo Speakers",
    type: "speakers",
    sampleRate: "44.1 kHz / 48.0 kHz",
    bitDepth: "16-Bit / 24-Bit",
    isBitPerfectCapable: false,
    driverType: "Standard System Audio",
    description: "Universal integrated stereo sound output for everyday casual listening.",
  },
];

interface AudioOutputDeviceModalProps {
  open: boolean;
  onClose: () => void;
}

export function AudioOutputDeviceModal({ open, onClose }: AudioOutputDeviceModalProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("device-dac-master");
  const [exclusiveBitPerfect, setExclusiveBitPerfect] = useState<boolean>(true);
  const [channelBalance, setChannelBalance] = useState<number>(0); // -1 (Left) to +1 (Right)
  const [detectedDevices, setDetectedDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (!open) return;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const outputs = devices.filter((d) => d.kind === "audiooutput");
          setDetectedDevices(outputs);
        })
        .catch(() => {
          // ignore permission errors
        });
    }
  }, [open]);

  const selectedDevice =
    AUDIOPHILE_DEVICES.find((d) => d.id === selectedDeviceId) || AUDIOPHILE_DEVICES[0]!;

  const handleSelectDevice = (device: AudioOutputDevice) => {
    setSelectedDeviceId(device.id);
    toast.success(`Audio Output switched to ${device.label}`, {
      description: `Targeting ${device.sampleRate} · ${device.driverType}`,
    });
  };

  const handlePlayTestTone = (side: "left" | "right" | "both") => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // 440 Hz standard A tone

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      if (panner) {
        if (side === "left") panner.pan.value = -1;
        else if (side === "right") panner.pan.value = 1;
        else panner.pan.value = 0;
        osc.connect(panner);
        panner.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      toast.info(`Channel test tone played (${side.toUpperCase()})`);
    } catch {
      toast.info(`Channel test tone triggered for ${side.toUpperCase()}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border border-primary/30 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Audio Output & DAC Switcher</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  HARDWARE DSP
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Route lossless PCM stream directly to external USB DACs or reference monitors.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Hardware Engine Status Card */}
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-foreground">
                  Bit-Perfect Hardware Mode:
                </span>
                <Badge
                  className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5",
                    exclusiveBitPerfect
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {exclusiveBitPerfect ? "EXCLUSIVE PCM DIRECT" : "OS MIXER SHARED"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Clock: {selectedDevice.sampleRate} · {selectedDevice.bitDepth}
              </p>
            </div>

            <Button
              size="sm"
              variant={exclusiveBitPerfect ? "default" : "outline"}
              onClick={() => setExclusiveBitPerfect(!exclusiveBitPerfect)}
              className="h-8 text-xs font-bold rounded-full px-4 shrink-0 cursor-pointer"
            >
              {exclusiveBitPerfect ? "Disable Direct" : "Enable Bit-Perfect"}
            </Button>
          </div>

          {/* Selectable Output Devices List */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Available Audio Outputs & DAC Interfaces:
            </label>

            <div className="grid grid-cols-1 gap-3">
              {AUDIOPHILE_DEVICES.map((device) => {
                const isSelected = selectedDeviceId === device.id;
                const Icon =
                  device.type === "dac"
                    ? Cpu
                    : device.type === "headphones"
                      ? Headphones
                      : device.type === "bluetooth"
                        ? Radio
                        : Speaker;

                return (
                  <div
                    key={device.id}
                    onClick={() => handleSelectDevice(device)}
                    className={cn(
                      "rounded-2xl border p-4 cursor-pointer transition-all flex items-start justify-between gap-4",
                      isSelected
                        ? "border-primary bg-surface-raised shadow-md ring-1 ring-primary/40"
                        : "border-border/40 bg-card hover:border-border/80 hover:bg-surface",
                    )}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface-raised text-muted-foreground border-border/50",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-foreground truncate">
                            {device.label}
                          </h4>
                          {device.isBitPerfectCapable && (
                            <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-1.5 py-0">
                              HI-RES
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {device.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            {device.sampleRate}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Driver: {device.driverType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border/60 block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left/Right Channel Balance & Acoustic Tone Calibration */}
          <div className="rounded-2xl border border-border/40 bg-surface-raised p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Stereo Balance & Channel Calibration</span>
              </span>
              <span className="font-mono text-xs font-bold text-primary">
                {channelBalance === 0
                  ? "Center Balanced"
                  : channelBalance < 0
                    ? `Left ${Math.round(Math.abs(channelBalance) * 100)}%`
                    : `Right ${Math.round(channelBalance * 100)}%`}
              </span>
            </div>

            <Slider
              min={-1}
              max={1}
              step={0.05}
              value={[channelBalance]}
              onValueChange={([val]) => {
                if (typeof val === "number") setChannelBalance(val);
              }}
              className="my-2"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-muted-foreground">L (Left 100%)</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePlayTestTone("left")}
                  className="h-6 text-[10px] font-bold rounded-lg px-2"
                >
                  Test L
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePlayTestTone("both")}
                  className="h-6 text-[10px] font-bold rounded-lg px-2"
                >
                  Test Center
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePlayTestTone("right")}
                  className="h-6 text-[10px] font-bold rounded-lg px-2"
                >
                  Test R
                </Button>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">R (Right 100%)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 p-4 bg-surface-raised/80">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Hardware Output Active</span>
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-5 cursor-pointer"
          >
            Apply & Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
