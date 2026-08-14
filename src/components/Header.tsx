import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  House,
  ShoppingBag,
  Radio,
  UploadCloud,
  Library,
  Search,
  Wifi,
  WifiOff,
  Sparkles,
  FolderOpen,
  Sliders,
  Music2,
  Disc3,
  Users,
  ListMusic,
  Settings,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModeSwitch } from "./ModeSwitch";
import { AudioConsoleModal } from "./AudioConsoleModal";
import { OfflineSettingsModal } from "./OfflineSettingsModal";
import { useAppMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const onlineNav = [
  { to: "/", label: "Home", icon: House },
  { to: "/stream", label: "Feed", icon: Sparkles },
  { to: "/radio", label: "Radio", icon: Radio },
  { to: "/store", label: "Store", icon: ShoppingBag },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/library", label: "Library", icon: Library },
];

const offlineNav = [
  { to: "/library", search: { tab: "tracks" }, label: "Local Library", icon: Music2 },
  { to: "/library", search: { tab: "folders" }, label: "Folders", icon: FolderOpen },
  { to: "/library", search: { tab: "albums" }, label: "Albums", icon: Disc3 },
  { to: "/library", search: { tab: "artists" }, label: "Artists", icon: Users },
  { to: "/library", search: { tab: "playlists" }, label: "Playlists", icon: ListMusic },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOffline, toggleMode } = useAppMode();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 border-b transition-colors",
          isOffline
            ? "border-emerald-500/20 bg-background/90 backdrop-blur-xl"
            : "border-border/40 bg-glass-strong"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/" className="flex items-center gap-2.5 text-foreground">
              <img
                src="/logo.png"
                alt="Layam"
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-contain drop-shadow-[0_0_8px_var(--color-glow-soft)]"
              />
              <span className="text-xl font-bold tracking-tight">Layam</span>
              {isOffline && (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/40 tracking-wider">
                  OFFLINE HI-FI SHELL
                </span>
              )}
            </Link>

            {/* Dynamic Navigation */}
            <nav className="hidden items-center gap-1 lg:flex">
              {isOffline ? (
                <>
                  {offlineNav.map((item, idx) => (
                    <Link
                      key={`${item.label}-${idx}`}
                      to={item.to}
                      search={item.search}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        pathname === item.to
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => setConsoleOpen(true)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Audio Console
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </button>
                </>
              ) : (
                onlineNav.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {!isOffline && (
              <div className="hidden md:flex">
                <Link to="/search" className="relative w-44 lg:w-56 block">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <div className="h-8 flex items-center border border-border/60 bg-surface-raised pl-9 text-xs text-muted-foreground rounded-full">
                    Search music, artists...
                  </div>
                </Link>
              </div>
            )}

            {isOffline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-emerald-400"
                title="Offline Hi-Fi Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            {/* Tactile Hardware Mode Switch */}
            <ModeSwitch />

            <UserMenu />
          </div>
        </div>
      </header>

      {/* Audio Console Modal */}
      <AudioConsoleModal open={consoleOpen} onClose={() => setConsoleOpen(false)} />

      {/* Offline Settings Modal */}
      <OfflineSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
