import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  House,
  ShoppingBag,
  Radio,
  UploadCloud,
  Library,
  Search,
  Sliders,
  Music2,
  Disc3,
  Users,
  ListMusic,
  Settings,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModeSwitch } from "./ModeSwitch";
import { AudioConsoleModal } from "./AudioConsoleModal";
import { OfflineSettingsModal } from "./OfflineSettingsModal";
import { useAppMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const onlineNav = [
  { to: "/", label: "Home" },
  { to: "/stream", label: "Discover" },
  { to: "/radio", label: "Radio" },
  { to: "/store", label: "Store" },
  { to: "/artists", label: "Artists" },
  { to: "/upload", label: "Upload" },
  { to: "/library", label: "Library" },
];

const offlineNav = [
  { to: "/library", search: { tab: "tracks" }, label: "Library", icon: Music2 },
  { to: "/library", search: { tab: "folders" }, label: "Folders", icon: FolderOpen },
  { to: "/library", search: { tab: "albums" }, label: "Albums", icon: Disc3 },
  { to: "/library", search: { tab: "artists" }, label: "Artists", icon: Users },
  { to: "/library", search: { tab: "playlists" }, label: "Playlists", icon: ListMusic },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOffline } = useAppMode();
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300 border-b backdrop-blur-2xl",
          isOffline
            ? "border-emerald-500/20 bg-background/85 shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
            : "border-border/40 bg-background/85 shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-6 lg:gap-10">
            <Link to="/" className="group flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90">
              <img
                src="/logo.png"
                alt="Layam"
                width={30}
                height={30}
                className="h-7 w-7 rounded-lg object-contain drop-shadow-[0_0_12px_var(--color-glow)] transition-transform group-hover:scale-105"
              />
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tracking-tight text-foreground">LAYAM</span>
                {isOffline ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest text-emerald-400 border border-emerald-500/30">
                    HI-FI
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-medium tracking-widest text-muted-foreground uppercase">
                    STUDIO
                  </span>
                )}
              </div>
            </Link>

            {/* Center: Minimalist Floating Pill Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              {isOffline ? (
                <>
                  {offlineNav.map((item, idx) => (
                    <Link
                      key={`${item.label}-${idx}`}
                      to={item.to}
                      search={item.search}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all",
                        pathname === item.to
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => setConsoleOpen(true)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    EQ Console
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
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
                        "rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all",
                        active
                          ? "bg-surface-raised text-foreground border border-border/80 shadow-sm"
                          : "text-muted-foreground hover:bg-surface hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })
              )}
            </nav>
          </div>

          {/* Right: Quick Search + Hardware Mode Switch + User */}
          <div className="flex items-center gap-3">
            {!isOffline && (
              <div className="hidden sm:flex">
                <Link
                  to="/search"
                  className="flex h-8 w-44 lg:w-56 items-center rounded-full border border-border/60 bg-surface px-3 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">Search masters, artists...</span>
                </Link>
              </div>
            )}

            {isOffline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-emerald-400 rounded-full"
                title="Audiophile Settings"
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
