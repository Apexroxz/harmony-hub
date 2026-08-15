import { Wallet, LogOut } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { connected, address, balance, connect, disconnect } = useWallet();

  if (connected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {balance.toFixed(2)} SOL
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="border-border/60 bg-surface-raised hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {short}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => connect()}
      className="bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90"
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
