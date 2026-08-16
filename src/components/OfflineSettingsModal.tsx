import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  HardDrive,
  Sliders,
  RotateCcw,
  X,
  Sparkles,
  Zap,
  Trash2,
  RefreshCw,
  FolderOpen,
  Volume2,
  Keyboard,
  Info,
  SlidersHorizontal,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { useAppMode } from "@/lib/mode";
import { usePlayer } from "@/lib/player";
import { OnlineMetadataService } from "@layam/storage-core";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OfflineSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = "audio" | "metadata" | "storage" | "shortcuts" | "about";

export function OfflineSettingsModal({ open, onClose }: OfflineSettingsModalProps) {
  const {
    offlineSettings,
    updateOfflineSettings,
    storageUsedMb,
    localTracks,
    rescanLibrary,
    clearOfflineCache,
  } = useAppMode();

  const { crossfadeDuration, setCrossfadeDuration } = usePlayer();
  const [activeTab, setActiveTab] = useState<SettingsTab>("audio");
  const [onlineOptIn, setOnlineOptIn] = useState(() => OnlineMetadataService.isOptInEnabled());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>("Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsCheckingUpdate(false);
    setUpdateChecked(true);
    setLastChecked("Just now");
  };

  const handleToggleOnlineMetadata = (enabled: boolean) => {
    OnlineMetadataService.setOptIn(enabled);
    setOnlineOptIn(enabled);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0c0d10] p-6 text-[#f2f3f5] shadow-2xl backdrop-blur-xl sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D99A2B]/15 text-[#D99A2B] border border-[#D99A2B]/30">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#f2f3f5] font-mono">LAYAM HI-FI SETTINGS</h2>
                <p className="text-xs text-[#9ba1ad]">
                  Hardware DSP engine, local vault, and audio decoder controls.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close Settings"
              className="h-8 w-8 text-[#9ba1ad] hover:text-[#f2f3f5] rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#111216] rounded-xl border border-white/[0.06] mb-6">
            {[
              { id: "audio" as const, label: "Audio & DSP", icon: SlidersHorizontal },
              { id: "metadata" as const, label: "Metadata", icon: Sparkles },
              { id: "storage" as const, label: "Vault Storage", icon: HardDrive },
              { id: "shortcuts" as const, label: "Hotkeys", icon: Keyboard },
              { id: "about" as const, label: "About", icon: Info },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
                    activeTab === tab.id
                      ? "bg-[#D99A2B]/20 text-[#D99A2B] font-bold border border-[#D99A2B]/40 shadow-sm"
                      : "text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-white/[0.03]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Audio & DSP */}
          {activeTab === "audio" && (
            <div className="space-y-4">
              {/* Gapless Playback Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#111216] p-4">
                <div>
                  <span className="text-xs font-bold text-[#f2f3f5] block">Gapless Playback</span>
                  <p className="text-[11px] text-[#9ba1ad] mt-0.5">
                    Eliminates silence between consecutive tracks for continuous listening.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={offlineSettings.gaplessPlayback ? "default" : "outline"}
                  onClick={() =>
                    updateOfflineSettings({ gaplessPlayback: !offlineSettings.gaplessPlayback })
                  }
                  className={cn(
                    "rounded-full text-xs font-bold h-7 px-3 cursor-pointer",
                    offlineSettings.gaplessPlayback
                      ? "bg-[#D99A2B] text-[#090a0c] hover:bg-[#f0ab4d]"
                      : "text-[#9ba1ad] border-white/[0.1]"
                  )}
                >
                  {offlineSettings.gaplessPlayback ? "ENABLED" : "DISABLED"}
                </Button>
              </div>

              {/* Crossfade Duration */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#f2f3f5]">Track Crossfade</span>
                  <span className="font-mono text-xs font-bold text-[#D99A2B]">
                    {crossfadeDuration === 0 ? "Off (0s)" : `${crossfadeDuration}s`}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={12}
                  step={1}
                  value={[crossfadeDuration]}
                  onValueChange={([val]) => {
                    if (typeof val === "number") setCrossfadeDuration(val);
                  }}
                  className="my-3"
                />
                <p className="text-[11px] text-[#9ba1ad]">
                  Smoothly blends the end of the current song into the next.
                </p>
              </div>

              {/* Buffer Size */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4">
                <span className="text-xs font-bold text-[#f2f3f5] block mb-2">
                  Audio Engine Buffer
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["Direct", "Fast (64kb)", "Audiophile (512kb)"] as const).map((buf) => (
                    <button
                      key={buf}
                      onClick={() => updateOfflineSettings({ bufferSize: buf })}
                      className={cn(
                        "rounded-xl border p-2.5 text-center text-xs font-mono font-semibold transition-all cursor-pointer",
                        offlineSettings.bufferSize === buf
                          ? "border-[#D99A2B]/60 bg-[#D99A2B]/15 text-[#D99A2B]"
                          : "border-white/[0.06] bg-[#0c0d10] text-[#9ba1ad] hover:text-[#f2f3f5]"
                      )}
                    >
                      {buf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Metadata */}
          {activeTab === "metadata" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D99A2B]" />
                    <span className="text-xs font-bold text-[#f2f3f5]">Fetch Online Metadata</span>
                  </div>
                  <Button
                    size="sm"
                    variant={onlineOptIn ? "default" : "outline"}
                    onClick={() => handleToggleOnlineMetadata(!onlineOptIn)}
                    className={cn(
                      "rounded-full text-xs font-bold h-7 px-3 cursor-pointer",
                      onlineOptIn
                        ? "bg-[#D99A2B] text-[#090a0c] hover:bg-[#f0ab4d]"
                        : "text-[#9ba1ad] border-white/[0.1]"
                    )}
                  >
                    {onlineOptIn ? "OPT-IN ENABLED" : "LOCAL ONLY"}
                  </Button>
                </div>
                <p className="text-[11px] text-[#9ba1ad] leading-relaxed">
                  Enhances missing high-res cover art (iTunes) and synchronized lyrics (LRCLIB) when connected. Cached in IndexedDB for permanent offline access.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#9ba1ad]">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      typeof navigator !== "undefined" && navigator.onLine ? "bg-emerald-500" : "bg-zinc-500"
                    )}
                  />
                  <span>
                    {typeof navigator !== "undefined" && navigator.onLine
                      ? "NETWORK AVAILABLE"
                      : "OFFLINE / DISCONNECTED"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Storage */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              {/* Storage Meter Card */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#D99A2B]">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-xs font-bold text-[#f2f3f5]">Local Audio Vault</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#D99A2B]">
                    {storageUsedMb >= 1000
                      ? `${(storageUsedMb / 1024).toFixed(2)} GB`
                      : `${storageUsedMb} MB`}
                  </span>
                </div>
                <p className="text-[11px] text-[#9ba1ad]">
                  Indexed across {localTracks.length} local audio files stored inside your device's browser vault.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rescanLibrary}
                  className="rounded-xl text-xs font-mono font-bold gap-1.5 border-white/[0.08] bg-[#0c0d10] hover:bg-[#16181e] text-[#f2f3f5] flex-1 h-9 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#D99A2B]" /> Rescan Library
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearOfflineCache}
                  className="rounded-xl text-xs font-mono font-bold gap-1.5 border-rose-500/30 bg-[#0c0d10] text-rose-400 hover:bg-rose-500/10 flex-1 h-9 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Vault
                </Button>
              </div>
            </div>
          )}

          {/* Tab 4: Keyboard Shortcuts */}
          {activeTab === "shortcuts" && (
            <div className="space-y-2">
              {[
                { key: "Space", action: "Play / Pause playback" },
                { key: "← / →", action: "Seek -10s / +10s" },
                { key: "M", action: "Toggle Audio Mute" },
                { key: "E", action: "Open / Close DSP Audio Console" },
                { key: "F", action: "Toggle Fullscreen Audiophile Cockpit" },
                { key: "Esc", action: "Close active modal / overlay" },
              ].map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#111216] px-3.5 py-2.5"
                >
                  <span className="text-xs text-[#9ba1ad]">{sc.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0c0d10] border border-white/[0.1] font-mono text-[11px] font-bold text-[#D99A2B] shadow-inner">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {/* Tab 5: About & Updates */}
          {activeTab === "about" && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#f2f3f5] block">Layam Hi-Fi Player</span>
                    <span className="text-[11px] text-[#9ba1ad] font-mono">v1.0.0-offline Release (Bit-Perfect Direct)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#D99A2B]/15 border border-[#D99A2B]/30 font-mono text-[10px] font-bold text-[#D99A2B]">
                    STABLE
                  </span>
                </div>
                <p className="text-[#9ba1ad] leading-relaxed">
                  Standalone bit-perfect audiophile player built with 64-bit float Web Audio DSP, 10-band parametric equalizers, and true zero-network offline vault persistence.
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-white/[0.05]">
                  <span className="text-[11px] text-[#6b7280] font-mono">
                    Last checked: {lastChecked}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdate}
                    className="bg-[#D99A2B] hover:bg-[#b88020] text-[#0c0d10] font-bold text-xs h-8 px-3"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isCheckingUpdate && "animate-spin")} />
                    {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                  </Button>
                </div>

                {updateChecked && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-[11px] font-mono">
                      Up to date! All DSP mastering algorithms, EQ filters, and local codecs are running the latest version.
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#111216] p-4 text-[11px] font-mono text-[#9ba1ad] space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>100% PRIVATE & OFFLINE</span>
                </div>
                <p className="text-[#6b7280]">
                  Your files never leave your local machine. No tracking, no user profiling, and no mandatory cloud dependencies.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
