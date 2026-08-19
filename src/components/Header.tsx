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
  Globe,
  Trophy,
  ChevronDown,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ModeSwitch } from "./ModeSwitch";
import { OfflineSettingsModal } from "./OfflineSettingsModal";
import { OctalysisGamificationModal } from "./OctalysisGamificationModal";
import { AudioComparisonModal } from "./AudioComparisonModal";
import { useAppMode } from "@/lib/mode";
import { usePlayer } from "@/lib/player";
import { useAuth } from "@/lib/auth";
import { useI18n, type LanguageCode } from "@/lib/i18n";
import { useGamification } from "@/lib/gamification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@layam/design-system";

const onlineNav = [
  { to: "/", label: "Home" },
  { to: "/stream", label: "Discover" },
  { to: "/feed", label: "Community" },
  { to: "/radio", label: "Radio" },
  { to: "/store", label: "Store" },
  { to: "/artists", label: "Artists" },
  { to: "/upload", label: "Upload" },
  { to: "/library", label: "Library" },
];

const studioNav = [
  { to: "/dashboard", label: "Studio" },
  { to: "/upload", label: "Upload" },
];

const offlineNav = [
  { to: "/library", search: { tab: "tracks" }, label: "Library", icon: Music2 },
  { to: "/library", search: { tab: "folders" }, label: "Folders", icon: FolderOpen },
  { to: "/library", search: { tab: "albums" }, label: "Albums", icon: Disc3 },
  { to: "/library", search: { tab: "artists" }, label: "Artists", icon: Users },
  { to: "/library", search: { tab: "playlists" }, label: "Playlists", icon: ListMusic },
];

export function Header() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { isOffline, toggleMode } = useAppMode();
  const { openConsole } = usePlayer();
  const { user } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { state: gamificationState, levelInfo } = useGamification();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamificationOpen, setGamificationOpen] = useState(false);
  const [blindTestOpen, setBlindTestOpen] = useState(false);

  const isStudioRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/upload");

  const isArtist = user?.role === "artist";

  const primaryNav = [
    { to: "/", key: "nav.home", label: "Home" },
    { to: "/stream", key: "nav.discover", label: "Discover" },
    { to: "/library", key: "nav.library", label: "Library" },
  ];

  const exploreNav = [
    { to: "/radio", label: "Lossless Radio", icon: Radio, desc: "Curated 24/96 streams & soundscapes" },
    { to: "/feed", label: "Community Feed", icon: Sparkles, desc: "Audiophile discussions & timestamps" },
    { to: "/artists", label: "Creators & Artists", icon: Users, desc: "Verified roster & discographies" },
    { to: "/store", label: "Master Store", icon: ShoppingBag, desc: "Bit-perfect master recordings" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300 border-b backdrop-blur-2xl bg-[#090a0c]/95 border-white/[0.07] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity with The Cycle SVG */}
          <div className="flex items-center gap-4 lg:gap-6">
            <Link
              to={isStudioRoute ? "/dashboard" : "/"}
              className="group flex items-center gap-2 text-[#f2f3f5] transition-opacity hover:opacity-90 flex-shrink-0"
            >
              <BrandLogo
                variant="compact"
                size="sm"
                showBadge={isOffline || isStudioRoute}
                badgeText={isOffline ? "HI-FI" : isStudioRoute ? "STUDIO" : undefined}
              />
            </Link>

            {/* Center: Minimalist Compact Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {isOffline ? (
                <>
                  {offlineNav.map((item, idx) => (
                    <Link
                      key={`${item.label}-${idx}`}
                      to={item.to}
                      search={item.search}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all",
                        pathname === item.to
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={openConsole}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    EQ
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </button>
                </>
              ) : isStudioRoute ? (
                /* Creator Studio Navigation */
                <>
                  {studioNav.map((item) => {
                    const active = pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all",
                          active
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <Link
                    to="/stream"
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all border border-border/40 ml-1.5"
                  >
                    <span>🎧 Listener View</span>
                  </Link>
                </>
              ) : (
                /* Minimalist Listener Navigation with Grouped Explore Dropdown */
                <>
                  {primaryNav.map((item) => {
                    const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all",
                          active
                            ? "bg-surface-raised text-foreground border border-border/80 shadow-sm"
                            : "text-muted-foreground hover:bg-surface hover:text-foreground",
                        )}
                      >
                        {t(item.key, item.label)}
                      </Link>
                    );
                  })}

                  {/* Explore & Features Combined Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer border border-transparent hover:border-border/40",
                          ["/store", "/radio", "/feed", "/artists"].some((p) => pathname.startsWith(p)) &&
                            "bg-surface-raised text-foreground border-border/80",
                        )}
                      >
                        <span>Explore</span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-64 rounded-2xl border border-border/60 bg-[#121316]/95 backdrop-blur-2xl p-2 shadow-2xl space-y-1"
                    >
                      {exploreNav.map((item) => (
                        <DropdownMenuItem key={item.to} asChild>
                          <Link
                            to={item.to}
                            className="flex items-start gap-2.5 rounded-xl p-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary mt-0.5">
                              <item.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-foreground">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}

                      {isArtist && (
                        <div className="pt-1 border-t border-white/[0.08]">
                          <DropdownMenuItem asChild>
                            <Link
                              to="/dashboard"
                              className="flex items-center gap-2 rounded-xl p-2 cursor-pointer hover:bg-primary/10 text-primary font-bold text-xs"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>🎨 Open Artist Studio</span>
                            </Link>
                          </DropdownMenuItem>
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </nav>
          </div>

          {/* Right Section: Compact Symmetrical Actions + Always Visible Sign-in / User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Settings Quick Icon Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
              title="Offline Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

            {/* Search Quick Icon Button */}
            {!isOffline && (
              <Link
                to="/search"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                title="Search masters..."
              >
                <Search className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Octalysis Master Rank & Streak Button */}
            <button
              onClick={() => setGamificationOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/40 px-2 py-1 text-xs font-mono transition-all hover:border-primary/40 hover:bg-white/[0.06] cursor-pointer"
              title="Octalysis Audiophile Mastery"
            >
              <Trophy className="h-3 w-3 text-primary" />
              <span className="text-primary font-bold text-[11px]">Lvl {levelInfo.level}</span>
              <span className="text-muted-foreground text-[10px] hidden sm:inline">{gamificationState.dailyStreak}d</span>
            </button>

            {/* Tactile Hardware Mode Switch */}
            <ModeSwitch />

            {/* Account / User Menu (ALWAYS PROMINENTLY VISIBLE) */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Offline Settings Modal */}
      <OfflineSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Octalysis Gamification Hub Modal */}
      <OctalysisGamificationModal
        open={gamificationOpen}
        onClose={() => setGamificationOpen(false)}
        onOpenBlindTest={() => {
          setGamificationOpen(false);
          setBlindTestOpen(true);
        }}
      />

      {/* Blind A/B Ear Test Modal */}
      <AudioComparisonModal open={blindTestOpen} onClose={() => setBlindTestOpen(false)} />
    </>
  );
}
