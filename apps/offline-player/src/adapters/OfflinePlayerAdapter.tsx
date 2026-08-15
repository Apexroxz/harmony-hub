import React, { type ReactNode, useEffect } from "react";
import { ModeProvider, useAppMode } from "@/lib/mode";
import { PlayerProvider } from "@/lib/player";
import { LocalVaultProvider } from "../providers/LocalVaultProvider";

interface OfflinePlayerAdapterProps {
  children: ReactNode;
}

function OfflineModeEnforcer({ children }: { children: ReactNode }) {
  const { setMode, isOffline } = useAppMode();

  useEffect(() => {
    if (!isOffline) {
      setMode("offline");
    }
  }, [isOffline, setMode]);

  return <>{children}</>;
}

/**
 * OfflinePlayerAdapter
 *
 * Connects the standalone offline player application with the shared design-system
 * UI components (PlayerBar, FullscreenAudiophilePlayer, AudioConsoleModal, Waveform)
 * while binding directly to @layam/audio-core and @layam/storage-core LocalVaultProvider.
 */
export const OfflinePlayerAdapter: React.FC<OfflinePlayerAdapterProps> = ({ children }) => {
  return (
    <ModeProvider>
      <OfflineModeEnforcer>
        <PlayerProvider>
          <LocalVaultProvider>
            {children}
          </LocalVaultProvider>
        </PlayerProvider>
      </OfflineModeEnforcer>
    </ModeProvider>
  );
};

export default OfflinePlayerAdapter;
