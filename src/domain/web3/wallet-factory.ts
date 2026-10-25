import { SolanaWalletAdapter } from "./solana.adapter";
import { EvmWalletAdapter } from "./evm.adapter";
import { MockDevWalletAdapter } from "./mock.adapter";
import type { IBlockchainWalletAdapter, WalletProviderInfo } from "./wallet.types";

export const SUPPORTED_WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: "phantom",
    name: "Phantom",
    chain: "Solana Mainnet-Beta",
    chainType: "solana",
    description: "Connect with Solana Phantom Wallet",
    gradient: "from-purple-500 to-indigo-600",
    badge: "Popular",
  },
  {
    id: "solflare",
    name: "Solflare",
    chain: "Solana Mainnet-Beta",
    chainType: "solana",
    description: "Solana non-custodial browser wallet",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "metamask",
    name: "MetaMask / Web3",
    chain: "Ethereum / Polygon",
    chainType: "evm",
    description: "Ethereum & EVM Web3 provider",
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: "demo",
    name: "Layam Audiophile Pass",
    chain: "Solana Devnet",
    chainType: "mock",
    description: "Instant demo wallet with 25.00 SOL testnet credits",
    gradient: "from-emerald-500 to-teal-600",
    badge: "Instant",
  },
];

export class WalletAdapterFactory {
  private static instances = new Map<string, IBlockchainWalletAdapter>();

  public static getAdapter(providerId = "phantom"): IBlockchainWalletAdapter {
    if (this.instances.has(providerId)) {
      return this.instances.get(providerId)!;
    }

    let adapter: IBlockchainWalletAdapter;
    if (providerId === "phantom" || providerId === "solflare") {
      adapter = new SolanaWalletAdapter(providerId);
    } else if (providerId === "metamask") {
      adapter = new EvmWalletAdapter(providerId);
    } else {
      adapter = new MockDevWalletAdapter();
    }

    this.instances.set(providerId, adapter);
    return adapter;
  }
}
