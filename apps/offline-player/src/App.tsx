import React, { useState, useEffect, useRef } from "react";
import { Plus, FolderOpen, Sliders, Info, Settings } from "lucide-react";
import { Toaster, toast } from "sonner";
import { BrandLogo } from "@layam/design-system";
import { PlayerBar } from "@/components/PlayerBar";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { FullscreenAudiophilePlayer } from "@/components/FullscreenAudiophilePlayer";
import { OfflineSettingsModal } from "@/components/OfflineSettingsModal";
import { usePlayer } from "@/lib/player";
import { useAppMode } from "@/lib/mode";
import { OfflinePlayerAdapter } from "./adapters/OfflinePlayerAdapter";
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";
import { OfflineLibrary } from "./views/OfflineLibrary";
import { OfflineAboutModal } from "./components/OfflineAboutModal";
import { useLocalVault } from "./providers/LocalVaultProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { androidMedia3 } from "@layam/audio-core";
import { OfflineService } from "@layam/storage-core";
import { useTheme } from "@/lib/theme";

function StandaloneBrandHeader({
  onOpenAbout,
  onOpenConsole,
  onOpenSettings,
}: {
  onOpenAbout: () => void;
  onOpenConsole: () => void;
  onOpenSettings: () => void;
}) {
  const { importLocalFiles } = useAppMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const importNativeFiles = async () => {
    const permResult = await androidMedia3.checkAudioPermission();
    if (!permResult.granted) {
      const requestResult = await androidMedia3.requestAudioPermission();
      if (!requestResult.granted) {
        toast.error("Audio Access Required", {
          description: "Storage / Audio permission is required to import and play music on your device. Please grant permission in Android settings.",
          duration: 5000,
        });
        return;
      }
    }

    const files = await androidMedia3.openDocumentPicker();
    if (files.length === 0) return;

    const imported = OfflineService.importNativeAudioFiles(files);
    if (imported.length > 0) {
      toast.success(`Imported ${imported.length} audio ${imported.length === 1 ? "track" : "tracks"}`);
    }
  };

  const scanNativeDeviceFolder = async () => {
    const permResult = await androidMedia3.checkAudioPermission();
    if (!permResult.granted) {
      const requestResult = await androidMedia3.requestAudioPermission();
      if (!requestResult.granted) {
        toast.error("Audio Access Required", {
          description: "Storage / Audio permission is required to scan music files on your device. Please grant permission in Android settings.",
          duration: 5000,
        });
        return;
      }
    }

    try {
      toast.loading("Scanning device audio...", { id: "device-scan" });
      const files = await androidMedia3.scanDeviceAudioFiles();
      toast.dismiss("device-scan");
      if (files.length === 0) {
        toast.info("No MediaStore Tracks Found", {
          description: "Opening file selector so you can pick music folders or files directly.",
        });
        await importNativeFiles();
        return;
      }
      const imported = OfflineService.importNativeAudioFiles(files);
      toast.success(`Discovered ${files.length} tracks on device (${imported.length} new)`);
    } catch (err) {
      toast.dismiss("device-scan");
      console.warn("[App] scanDeviceAudioFiles fallback to picker:", err);
      await importNativeFiles();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await importLocalFiles(files);
    e.target.value = "";
  };

  const handleAddFiles = () => {
    if (androidMedia3.isNativeAndroid()) {
      void importNativeFiles();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleScanFolder = () => {
    if (androidMedia3.isNativeAndroid()) {
      void scanNativeDeviceFolder();
      return;
    }
    folderInputRef.current?.click();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] bg-[var(--bg-obsidian,#090a0c)]/95 backdrop-blur-md px-3 sm:px-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2.5 sm:py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="hidden sm:block">
          <BrandLogo variant="full" size="sm" showBadge badgeText="BIT-PERFECT" subtitle="LOSSLESS LOCAL PLAYBACK" />
        </div>
        <div className="block sm:hidden">
          <BrandLogo variant="compact" size="sm" showBadge={false} />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="audio/*,.flac,.wav,.mp3,.alac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.au,.snd,.ape,.wv,.wma,.ac3,.dts"
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFileSelect}
          multiple
          // @ts-expect-error webkitdirectory standard
          webkitdirectory=""
          className="hidden"
        />

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button onClick={handleAddFiles} className="min-h-[40px] flex items-center gap-1.5 rounded-lg bg-[#e59e38] px-3 py-2 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] active:bg-[#d48d2a] transition-colors cursor-pointer shadow-sm">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Files</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button onClick={handleScanFolder} className="min-h-[40px] hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-charcoal,#111216)] px-3 py-2 text-xs font-medium text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] active:bg-[var(--surface-active,#1e2027)] transition-colors cursor-pointer">
            <FolderOpen className="h-3.5 w-3.5 text-[var(--text-secondary,#9ba1ad)]" />
            Scan Folder
          </button>

          <button onClick={onOpenConsole} className="min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-charcoal,#111216)] p-2 sm:px-3 sm:py-2 text-xs font-medium text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] transition-colors cursor-pointer" title="10-Band Hardware Equalizer">
            <Sliders className="h-4 w-4 text-[#e59e38]" />
            <span className="hidden sm:inline">Audio Console</span>
          </button>

          <button onClick={onOpenSettings} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-charcoal,#111216)] p-2 text-xs font-medium text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] transition-colors cursor-pointer" title="Hi-Fi Settings & Hotkeys">
            <Settings className="h-4 w-4 text-[#e59e38]" />
          </button>

          <button onClick={onOpenAbout} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-[var(--surface-charcoal,#111216)] p-2 text-xs font-medium text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)] hover:bg-[var(--surface-raised,#16181e)] transition-colors cursor-pointer" title="About Layam & Privacy Settings">
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function OfflinePlayerLayout() {
  const { isAboutOpen, setIsAboutOpen } = useLocalVault();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isConsoleOpen, openConsole, closeConsole, toggleConsole, isExpanded, collapsePlayer } = usePlayer();
  const { theme } = useTheme();

  useGlobalHotkeys({ onToggleConsole: toggleConsole });

  useEffect(() => {
    try { localStorage.removeItem("layam_offline_anonymous_device_id"); } catch {}
  }, []);

  const stateRef = useRef({
    isExpanded,
    isConsoleOpen,
    isSettingsOpen,
    isAboutOpen,
    collapsePlayer,
    closeConsole,
    setIsSettingsOpen,
    setIsAboutOpen,
  });

  useEffect(() => {
    stateRef.current = {
      isExpanded,
      isConsoleOpen,
      isSettingsOpen,
      isAboutOpen,
      collapsePlayer,
      closeConsole,
      setIsSettingsOpen,
      setIsAboutOpen,
    };
  });

  // Intercept Android hardware Back button / gesture:
  // Sequential modal dismissal before minimizing/exiting app
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    import("@capacitor/app").then(({ App: CapApp }) => {
      CapApp.addListener("backButton", () => {
        const s = stateRef.current;
        console.log("[LAYAM_JS] backButton intercepted. isConsoleOpen:", s.isConsoleOpen, "isSettingsOpen:", s.isSettingsOpen, "isExpanded:", s.isExpanded);
        if (s.isConsoleOpen) {
          s.closeConsole();
          return;
        }
        if (s.isSettingsOpen) {
          s.setIsSettingsOpen(false);
          return;
        }
        if (s.isAboutOpen) {
          s.setIsAboutOpen(false);
          return;
        }
        if (s.isExpanded) {
          s.collapsePlayer();
          return;
        }

        // If no modal or player is expanded, minimize app so background audio continues seamlessly
        void CapApp.minimizeApp();
      }).then((handle) => {
        removeListener = () => void handle.remove();
      });
    }).catch((err) => {
      console.warn("[App] Back button setup note:", err);
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-obsidian,#090a0c)] text-[var(--text-primary,#f2f3f5)] pb-28 flex flex-col transition-colors duration-200">
      <StandaloneBrandHeader
        onOpenConsole={openConsole}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main className="mx-auto flex-1 w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <OfflineLibrary />
      </main>

      <PlayerBar />
      <FullscreenAudiophilePlayer open={isExpanded} onClose={collapsePlayer} />

      <AudioConsoleModal
        open={isConsoleOpen}
        onClose={closeConsole}
      />

      <OfflineSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <OfflineAboutModal />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <OfflinePlayerAdapter>
        <OfflinePlayerLayout />
      </OfflinePlayerAdapter>
    </ErrorBoundary>
  );
}

export default App;
