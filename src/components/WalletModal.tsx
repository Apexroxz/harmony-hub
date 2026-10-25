import { useState } from "react";
import {
  Wallet,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useWallet, WALLET_PROVIDERS } from "@/lib/wallet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WalletModal() {
  const {
    connected,
    address,
    balance,
    providerName,
    isModalOpen,
    closeModal,
    connect,
    disconnect,
    isConnecting,
    connectingProvider,
  } = useWallet();

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentProvider =
    WALLET_PROVIDERS.find((p) => p.name === providerName) ?? WALLET_PROVIDERS[0]!;

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-md border-border/60 bg-background/95 p-6 backdrop-blur-xl sm:rounded-3xl shadow-2xl">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-primary">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {connected ? "Connected Account" : "Web3 Identity"}
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            {connected ? "Wallet Details" : "Connect your Wallet"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {connected
              ? "Manage your connected Web3 address, view SOL balance, or disconnect."
              : "Connect your Web3 wallet to stream token-gated audio, buy music NFTs, and support artists."}
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="my-8 flex flex-col items-center justify-center py-8 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping opacity-25" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Connecting to {connectingProvider}...
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Please approve the connection request in your wallet extension.
            </p>
          </div>
        ) : connected && address ? (
          <div className="mt-4 space-y-4">
            {/* Connected Card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface-raised to-background p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r text-white font-bold shadow-md",
                      currentProvider.gradient,
                    )}
                  >
                    {currentProvider.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{currentProvider.name}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        Connected
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{currentProvider.chain}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{balance.toFixed(2)} SOL</div>
                  <span className="text-[11px] text-muted-foreground">Available balance</span>
                </div>
              </div>

              {/* Address bar */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-xs backdrop-blur-sm">
                <span className="font-mono text-muted-foreground font-medium truncate max-w-[240px]">
                  {address}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                asChild
                className="border-border/60 bg-surface-raised hover:bg-accent text-xs"
              >
                <a
                  href={`https://explorer.solana.com/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  Solana Explorer
                </a>
              </Button>

              <Button
                variant="outline"
                onClick={disconnect}
                className="border-destructive/30 bg-destructive/5 hover:bg-destructive/15 text-destructive hover:text-destructive text-xs"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground border border-primary/10">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>Token-gated tracks across Layam are now unlocked for streaming.</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {WALLET_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => void connect(provider.id)}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card p-3.5 transition-all duration-200 hover:border-primary/50 hover:bg-surface-raised hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r text-white font-bold shadow-md transition-transform group-hover:scale-105",
                      provider.gradient,
                    )}
                  >
                    {provider.id === "demo" ? (
                      <Zap className="h-5 w-5 fill-current" />
                    ) : (
                      provider.name[0]
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {provider.name}
                      </span>
                      {provider.badge && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                          {provider.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {provider.description}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-60 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
              </button>
            ))}

            <div className="mt-4 flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Compatible with Phantom, Solflare & standard Web3 extensions.</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
