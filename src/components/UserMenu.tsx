import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Sparkles,
  LogOut,
  ShieldCheck,
  Music2,
  Check,
  Crown,
  Layers,
  ShoppingBag,
  Radio,
  Users,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const {
    user,
    isArtist,
    isCreator,
    isListener,
    isDeveloper,
    isAdmin,
    role,
    setRole,
    logout,
    upgradeToArtist,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayRole = (role || "listener").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 sm:h-9 gap-1.5 sm:gap-2 rounded-full border border-border/60 bg-surface-raised px-2.5 sm:px-3 text-xs font-semibold cursor-pointer shadow-sm transition-all hover:bg-card",
            isDeveloper && "border-amber-500/40 text-amber-400 bg-amber-500/10",
            (isCreator || isArtist) && !isDeveloper && "border-primary/40 text-primary bg-primary/10",
          )}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              isDeveloper
                ? "bg-amber-500/20 text-amber-400"
                : isCreator || isArtist
                ? "bg-primary/20 text-primary"
                : "bg-muted text-foreground",
            )}
          >
            {isDeveloper ? (
              <Crown className="h-3 w-3" />
            ) : mounted && user?.name ? (
              user.name[0]?.toUpperCase()
            ) : (
              "U"
            )}
          </div>
          <span className="hidden sm:inline font-medium text-foreground">
            {mounted && user?.name ? user.name : "My Account"}
          </span>
          <Badge
            className={cn(
              "text-[9px] px-1.5 py-0 font-bold",
              isDeveloper
                ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : isCreator || isArtist
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground border border-border/60",
            )}
          >
            {displayRole}
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
        <DialogHeader className="mb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Crown className="h-5 w-5 text-amber-400" />
            <span>Platform Account & Portals</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Manage your account credentials, creator permissions, and portal shortcuts.
          </p>
        </DialogHeader>

        {/* Current Active Mode */}
        <div className="rounded-2xl border border-border/60 bg-surface-raised p-3.5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl font-bold",
                  isDeveloper
                    ? "bg-amber-500/20 text-amber-400"
                    : isCreator || isArtist
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-foreground",
                )}
              >
                {isDeveloper ? (
                  <Crown className="h-5 w-5" />
                ) : user?.name ? (
                  user.name[0]?.toUpperCase()
                ) : (
                  "U"
                )}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">
                  {user?.name || (isDev ? "Developer Sandbox" : "Layam Member")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "listener@layam.app"}
                </p>
              </div>
            </div>

            <Badge
              className={
                isDeveloper
                  ? "bg-amber-500 text-black font-bold"
                  : isCreator || isArtist
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-raised text-muted-foreground border border-border/60"
              }
            >
              {isDeveloper
                ? "👑 Developer"
                : isCreator || isArtist
                ? "🎨 Creator"
                : "🎧 Listener"}
            </Badge>
          </div>
        </div>

        {/* Dev-Only Persona Switcher */}
        {isDev && (
          <div className="space-y-1.5 mb-4 p-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Dev Persona Simulation (Local Only)
              </label>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px]">
                ENV: DEV
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Developer Mode */}
              <button
                onClick={() => setRole("developer")}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all cursor-pointer",
                  isDeveloper
                    ? "border-amber-500 bg-amber-500/20 text-amber-400 font-bold"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>👑 Dev</span>
                  {isDeveloper && <Check className="h-3 w-3" />}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Bypass all</div>
              </button>

              {/* Creator Mode */}
              <button
                onClick={() => setRole("creator")}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all cursor-pointer",
                  (isCreator || isArtist) && !isDeveloper
                    ? "border-primary bg-primary/20 text-primary font-bold"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🎨 Creator</span>
                  {(isCreator || isArtist) && !isDeveloper && <Check className="h-3 w-3" />}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Studio tools</div>
              </button>

              {/* Listener Mode */}
              <button
                onClick={() => setRole("listener")}
                className={cn(
                  "p-2 rounded-xl border text-left transition-all cursor-pointer",
                  isListener
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🎧 Listener</span>
                  {isListener && <Check className="h-3 w-3" />}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Standard</div>
              </button>
            </div>
          </div>
        )}

        {/* Listener Upgrade CTA when not creator */}
        {!isCreator && !isArtist && !isDeveloper && (
          <div className="mb-4 p-3 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-foreground">Want to distribute music?</p>
              <p className="text-[11px] text-muted-foreground">Unlock artist studio and split sheets.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                void upgradeToArtist();
                setOpen(false);
              }}
              className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-8 px-3"
            >
              Become Creator
            </Button>
          </div>
        )}

        {/* Instant Access Hub to All Platform Features */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Portals & Shortcuts
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Creator Studio
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>

            <Link
              to="/upload"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Upload Master
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>

            <Link
              to="/store"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Master Store
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>

            <Link
              to="/artists"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Artists & Roster
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Reset / Sign Out */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
          <div />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void logout();
              setOpen(false);
            }}
            className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
