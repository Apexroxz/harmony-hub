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
  const { user, isArtist, isListener, isDeveloper, role, setRole, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 sm:h-9 gap-1.5 sm:gap-2 rounded-full border border-border/60 bg-surface-raised px-2.5 sm:px-3 text-xs font-semibold cursor-pointer shadow-sm transition-all hover:bg-card",
            isDeveloper && "border-amber-500/40 text-amber-400 bg-amber-500/10",
            isArtist && !isDeveloper && "border-primary/40 text-primary bg-primary/10",
          )}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
              isDeveloper
                ? "bg-amber-500/20 text-amber-400"
                : isArtist
                ? "bg-primary/20 text-primary"
                : "bg-muted text-foreground",
            )}
          >
            {isDeveloper ? <Crown className="h-3 w-3" /> : mounted && user?.name ? user.name[0]?.toUpperCase() : "U"}
          </div>
          <span className="hidden sm:inline font-medium text-foreground">
            {mounted && user?.name ? user.name : "Master Developer"}
          </span>
          <Badge
            className={cn(
              "text-[9px] px-1.5 py-0 font-bold",
              isDeveloper
                ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : isArtist
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground border border-border/60",
            )}
          >
            {isDeveloper ? "DEVELOPER" : isArtist ? "ARTIST" : "LISTENER"}
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
        <DialogHeader className="mb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Crown className="h-5 w-5 text-amber-400" />
            <span>Platform Access & Master Controls</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Switch your role or jump directly to any master token, proof, or studio portal.
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
                    : isArtist
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-foreground",
                )}
              >
                {isDeveloper ? <Crown className="h-5 w-5" /> : user?.name ? user.name[0]?.toUpperCase() : "U"}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">
                  {user?.name || "Master Developer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "developer@layam.app"}
                </p>
              </div>
            </div>

            <Badge
              className={
                isDeveloper
                  ? "bg-amber-500 text-black font-bold"
                  : isArtist
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-raised text-muted-foreground border border-border/60"
              }
            >
              {isDeveloper ? "👑 Developer (All)" : isArtist ? "🎨 Artist" : "🎧 Listener"}
            </Badge>
          </div>
        </div>

        {/* 1-Click Role Switcher */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Switch Access Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Developer Mode */}
            <button
              onClick={() => setRole("developer")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                isDeveloper
                  ? "border-amber-500 bg-amber-500/15 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>👑 Developer</span>
                {isDeveloper && <Check className="h-3 w-3" />}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Unlock everything</div>
            </button>

            {/* Artist Creator */}
            <button
              onClick={() => setRole("artist")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                isArtist && !isDeveloper
                  ? "border-primary bg-primary/15 text-primary font-bold shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>🎨 Artist</span>
                {isArtist && !isDeveloper && <Check className="h-3 w-3" />}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Studio & Stems</div>
            </button>

            {/* Listener */}
            <button
              onClick={() => setRole("listener")}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                isListener
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>🎧 Listener</span>
                {isListener && <Check className="h-3 w-3" />}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Hi-Fi Playback</div>
            </button>
          </div>
        </div>

        {/* Instant Access Hub to All Platform Features */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Direct Access to All Portals & Proofs
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/track/$id"
              params={{ id: "track-1" }}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Master Proof & Token
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>

            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Artist Creator Studio
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
                  Master Store & FLACs
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
                  Artists & Creators
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>

            <Link
              to="/radio"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-400" />
                <span className="font-medium text-foreground group-hover:text-primary">
                  Lossless Radio
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
                  Master Ingestion
                </span>
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Reset / Sign Out */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRole("developer");
              setOpen(false);
            }}
            className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            👑 Restore Master Developer Access
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
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
