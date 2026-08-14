import { Link, useRouterState } from "@tanstack/react-router";
import { House, ShoppingBag, Radio, UploadCloud, Library, Search, Wifi, WifiOff, Sparkles } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { UserMenu } from "./UserMenu";
import { useAppMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: House },
  { to: "/stream", label: "Feed", icon: Sparkles },
  { to: "/radio", label: "Radio", icon: Radio },
  { to: "/store", label: "Store", icon: ShoppingBag },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/library", label: "Library", icon: Library },
];

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOffline, toggleMode } = useAppMode();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-glass-strong">
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
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => {
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
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex">
            <Link to="/search" className="relative w-48 lg:w-60 block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <div className="h-8 flex items-center border border-border/60 bg-surface-raised pl-9 text-xs text-muted-foreground rounded-full">
                Search music, artists...
              </div>
            </Link>
          </div>

          {/* Mode Switcher Pill */}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleMode}
            className={cn(
              "h-8 px-2.5 rounded-full text-xs font-bold gap-1.5 transition-all shadow-sm",
              isOffline
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border/60 bg-surface-raised text-muted-foreground hover:text-foreground hover:bg-card"
            )}
            title={isOffline ? "Currently in Offline Mode (Local Library Only)" : "Currently in Online Mode (Full Streaming & Store)"}
          >
            {isOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Offline Mode</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Online</span>
              </>
            )}
          </Button>

          <UserMenu />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
