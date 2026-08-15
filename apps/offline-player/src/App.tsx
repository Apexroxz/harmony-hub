import React, { useState, useRef } from "react";
import { Plus, FolderOpen, Sliders, Info } from "lucide-react";
import { BrandLogo } from "@layam/design-system";
import { PlayerBar } from "@/components/PlayerBar";
import { AudioConsoleModal } from "@/components/AudioConsoleModal";
import { FullscreenAudiophilePlayer } from "@/components/FullscreenAudiophilePlayer";
import { usePlayer } from "@/lib/player";
import { useAppMode } from "@/lib/mode";
import { OfflinePlayerAdapter } from "./adapters/OfflinePlayerAdapter";
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";
import { OfflineLibrary } from "./views/OfflineLibrary";
import { OfflineAboutModal } from "./components/OfflineAboutModal";
import { useLocalVault } from "./providers/LocalVaultProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

function StandaloneBrandHeader({ onOpenAbout, onOpenConsole }: { onOpenAbout: () => void; onOpenConsole: () => void }) {
  const { importLocalFiles } = useAppMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await importLocalFiles(files);
    }
    e.target.value = "";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090a0c]/95 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand & Hardware Telemetry */}
        <BrandLogo
          variant="full"
          size="sm"
          showBadge
          badgeText="BIT-PERFECT"
          subtitle="LOSSLESS LOCAL PLAYBACK"
        />

        {/* Hidden Inputs */}
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

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-[#e59e38] px-3 py-1.5 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] active:bg-[#d48d2a] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Files</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111216] px-3 py-1.5 text-xs font-medium text-[#f2f3f5] hover:bg-[#16181e] active:bg-[#1e2027] transition-colors cursor-pointer"
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#9ba1ad]" />
            Scan Folder
          </button>

          <button
            onClick={onOpenConsole}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111216] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#16181e] transition-colors cursor-pointer"
            title="10-Band Hardware Equalizer"
          >
            <Sliders className="h-3.5 w-3.5 text-[#e59e38]" />
            <span className="hidden sm:inline">Audio Console</span>
          </button>

          <button
            onClick={onOpenAbout}
            className="flex items-center rounded-lg border border-white/[0.08] bg-[#111216] p-1.5 text-xs font-medium text-[#9ba1ad] hover:text-[#f2f3f5] hover:bg-[#16181e] transition-colors cursor-pointer"
            title="About Layam & Privacy Settings"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function OfflinePlayerLayout() {
  const { isAboutOpen, setIsAboutOpen } = useLocalVault();
  const {
    isConsoleOpen,
    openConsole,
    closeConsole,
    toggleConsole,
    isExpanded,
    collapsePlayer,
  } = usePlayer();

  // Wire hardware audiophile hotkeys (Space, Arrows, M, F, E)
  useGlobalHotkeys({
    onToggleConsole: toggleConsole,
  });

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f2f3f5] pb-[env(safe-area-inset-bottom)] antialiased">
      <StandaloneBrandHeader
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenConsole={openConsole}
      />
      <main className="pb-36">
        <OfflineLibrary />
      </main>
      
      {/* Precision Hi-Fi Hardware Cockpit Bar (Mutually exclusive with Fullscreen) */}
      {!isExpanded && <PlayerBar />}
      
      {/* Top-Level Global Modals (Mounted Independently) */}
      <AudioConsoleModal open={isConsoleOpen} onClose={closeConsole} />
      <FullscreenAudiophilePlayer open={isExpanded} onClose={collapsePlayer} />
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
