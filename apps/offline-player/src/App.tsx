import React, { useState, useEffect, useRef } from "react";
import { Plus, FolderOpen, Sliders, Info, Settings } from "lucide-react";
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
import { OfflineService, registerNativeAudioUri } from "@layam/storage-core";

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
  const { localTracks } = useLocalVault();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const importNativeFiles = async () => {
    const files = await androidMedia3.openDocumentPicker();
    if (files.length === 0) return;

    const existingKeys = new Set(
      localTracks.map((track) => `${track.title.toLowerCase()}|${track.fileSizeBytes || 0}`),
    );
    const imported = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      const key = `${file.title.toLowerCase()}|${file.sizeBytes || 0}`;
      if (existingKeys.has(key)) continue;

      const id = `local-imported-android-${Date.now()}-${i}`;
      registerNativeAudioUri(id, file.uri);
      imported.push({
        id,
        title: file.title || file.name.replace(/\.[^.]+$/, ""),
        artistId: "local-device",
        artistName: file.artist || "Local Artist",
        artist: file.artist || "Local Artist",
        coverImage: "",
        audioUrl: "",
        duration: file.durationMs > 0 ? file.durationMs / 1000 : 0,
        genre: "Local Audio",
        quality: file.format || "AUDIO",
        format: file.format || "AUDIO",
        source: "offline" as const,
        bitrate: file.bitrate || 0,
        sampleRate: 0,
        bitDepth: 0,
        playCount: 0,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        uploaderId: "local-device",
        folderPath: "Android Music",
        album: file.album || "Local Master Imports",
        fileSizeBytes: file.sizeBytes || 0,
      });
      existingKeys.add(key);
    }

    if (imported.length > 0) {
      OfflineService.saveTracks([...imported, ...localTracks]);
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
      // Android SAF uses the multi-file audio picker here; folder-tree support can be added separately.
      void importNativeFiles();
      return;
    }
    folderInputRef.current?.click();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090a0c]/95 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <BrandLogo variant="full" size="sm" showBadge badgeText="BIT-PERFECT" subtitle="LOSSLESS LOCAL PLAYBACK" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="audio/*,.flac,.wav,.mp3,.alac,.m4a,.aac,.ogg"
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

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button onClick={handleAddFiles} className="flex items-center gap-1.5 rounded-lg bg-[#e59e38] px-3 py-1.5 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] active:bg-[#d48d2a] transition-colors cursor-pointer shadow-sm">
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Files</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button onClick={handleScanFolder} className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111216] px-3 py-1.5 text-xs font-medium text-[#f2f3f5] hover:bg-[#16181e] active:bg-[#1e2027] transition-colors cursor-pointer">
            <FolderOpen className="h-3.5 w-3.5 text-[#9ba1ad]" />
            Scan Folder
          </button>

          <button onClick={onOpenConsole} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111216] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#16181e] transition-colors cursor-pointer" title="10-Band Hardware Equalizer">
            <Sliders className="h-3.5 w-3.5 text-[#e59e38]" />
            <span className="hidden sm:inline">Audio Console</span>
          </button>

          <button onClick={onOpenSettings} className="flex items-center rounded-lg border border-white/[0.08] bg-[#111216] p-1.5 text-xs font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#16181e] transition-colors cursor-pointer" title="Hi-Fi Settings & Hotkeys">
            <Settings className="h-4 w-4 text-[#e59e38]" />
          </button>

          <button onClick={onOpenAbout} className="flex items-center rounded-lg border border-white/[0.08] bg-[#111216] p-1.5 text-xs font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#16181e] transition-colors cursor-pointer" title="About Layam & Privacy Settings">
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

  useGlobalHotkeys({ onToggleConsole: toggleConsole });

  useEffect(() => {
    try { localStorage.removeItem("layam_offline_anonymous_device_id"); } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f2f3f5] pb-[env(safe-area-inset-bottom)] antialiased">
      <StandaloneBrandHeader
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenConsole={openConsole}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="pb-36"><OfflineLibrary /></main>
      {!isExpanded && <PlayerBar />}
      <AudioConsoleModal open={isConsoleOpen} onClose={closeConsole} />
      <FullscreenAudiophilePlayer open={isExpanded} onClose={collapsePlayer} />
      <OfflineSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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
