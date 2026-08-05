import { Link, useRouterState } from "@tanstack/react-router";
import { Disc3, Radio, Compass, UploadCloud } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/stream", label: "Stream", icon: Radio },
  { to: "/browse", label: "Browse", icon: Compass },
  { to: "/upload", label: "Upload", icon: UploadCloud },
];


export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <Disc3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">Layam</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
