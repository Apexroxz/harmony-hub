import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface WalletProviderInfo {
  id: string;
  name: string;
  chain: string;
  description: string;
  gradient: string;
  badge?: string;
}

export const WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: "phantom",
    name: "Phantom",
    chain: "Solana Mainnet-Beta",
    description: "Connect with Solana Phantom Wallet",
    gradient: "from-purple-500 to-indigo-600",
    badge: "Popular",
  },
  {
    id: "solflare",
    name: "Solflare",
    chain: "Solana Mainnet-Beta",
    description: "Solana non-custodial browser wallet",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "metamask",
    name: "MetaMask / Web3",
    chain: "Ethereum / Polygon",
    description: "Ethereum & EVM Web3 provider",
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: "demo",
    name: "Layam Audiophile Pass",
    chain: "Solana Devnet",
    description: "Instant demo wallet with 25.00 SOL testnet credits",
    gradient: "from-emerald-500 to-teal-600",
    badge: "Instant",
  },
];

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  avatar: string | null;
  providerName: string | null;
  isModalOpen: boolean;
  isConnecting: boolean;
  connectingProvider: string | null;
}

export interface WalletContextValue extends WalletState {
  connect: (providerId?: string) => Promise<void> | void;
  disconnect: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const MOCK_ADDRESS = "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0,
    avatar: null,
    providerName: null,
    isModalOpen: false,
    isConnecting: false,
    connectingProvider: null,
  });

  const openModal = useCallback(() => {
    setState((s) => ({ ...s, isModalOpen: true }));
  }, []);

  const closeModal = useCallback(() => {
    setState((s) => ({ ...s, isModalOpen: false }));
  }, []);

  const connect = useCallback((providerId?: string) => {
    const provider = WALLET_PROVIDERS.find((p) => p.id === providerId) ?? WALLET_PROVIDERS[0]!;
    setState((s) => ({
      ...s,
      isConnecting: true,
      connectingProvider: provider.name,
    }));

    setTimeout(() => {
      setState((s) => ({
        ...s,
        connected: true,
        address: MOCK_ADDRESS,
        balance: 24.5,
        avatar: null,
        providerName: provider.name,
        isConnecting: false,
        connectingProvider: null,
        isModalOpen: false,
      }));
    }, 400);
  }, []);

  const disconnect = useCallback(() => {
    setState((s) => ({
      ...s,
      connected: false,
      address: null,
      balance: 0,
      avatar: null,
      providerName: null,
      isConnecting: false,
      connectingProvider: null,
    }));
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        openModal,
        closeModal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
