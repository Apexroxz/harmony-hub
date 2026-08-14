import { useState } from "react";
import { User, Sparkles, LogOut, ShieldCheck, Music2, ArrowUpRight, Check } from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, isArtist, isListener, demoLogin, logout, upgradeToArtist } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-full border border-border/60 bg-surface-raised px-3 text-xs font-semibold cursor-pointer shadow-sm transition-all hover:bg-card",
            isArtist && "border-primary/40 text-primary bg-primary/10"
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
            {user?.name ? user.name[0]?.toUpperCase() : "U"}
          </div>
          <span className="hidden sm:inline font-medium text-foreground">
            {user?.name || "Guest Listener"}
          </span>
          <Badge
            className={cn(
              "text-[9px] px-1.5 py-0 font-bold",
              isArtist
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground border border-border/60"
            )}
          >
            {isArtist ? "ARTIST" : "LISTENER"}
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <User className="h-5 w-5 text-primary" />
            <span>Account Role & Profile</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Manage your account role (Listener vs Artist Creator).
          </p>
        </DialogHeader>

        {/* Current User Card */}
        <div className="rounded-2xl border border-border/60 bg-surface-raised p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold">
                {user?.name ? user.name[0]?.toUpperCase() : "U"}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{user?.name || "Guest Listener"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "listener@layam.app"}</p>
              </div>
            </div>

            <Badge
              className={
                isArtist
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-raised text-muted-foreground border border-border/60"
              }
            >
              {isArtist ? "Artist Creator" : "Listener"}
            </Badge>
          </div>
        </div>

        {/* Upgrade to Creator Button (For Listeners) */}
        {isListener && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Become an Artist Creator</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upgrade your account to upload high-fidelity FLAC audio files, configure collaborator splits, and access real-time stream analytics.
            </p>
            <Button
              onClick={() => {
                upgradeToArtist();
                setOpen(false);
              }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md cursor-pointer"
            >
              <Music2 className="mr-1.5 h-3.5 w-3.5" />
              Upgrade to Artist Account
            </Button>
          </div>
        )}

        {/* Quick Role Switcher */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Quick Role Switcher
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                demoLogin("listener");
                setOpen(false);
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer",
                isListener
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>🎧 Listener</span>
                {isListener && <Check className="h-3.5 w-3.5" />}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Stream & download music</div>
            </button>

            <button
              onClick={() => {
                demoLogin("artist");
                setOpen(false);
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition-all cursor-pointer",
                isArtist
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>🎨 Artist Creator</span>
                {isArtist && <Check className="h-3.5 w-3.5" />}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Upload & analytics</div>
            </button>
          </div>
        </div>

        {/* Logout */}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full text-xs text-muted-foreground hover:text-destructive cursor-pointer justify-start"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
