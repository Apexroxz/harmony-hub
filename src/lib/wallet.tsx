import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  WalletAdapterFactory,
  SUPPORTED_WALLET_PROVIDERS,
} from "@/domain/web3/wallet-factory";
import type {
  WalletProviderInfo,
  SignedMessageResult,
  ChainType,
} from "@/domain/web3/wallet.types";

export { SUPPORTED_WALLET_PROVIDERS as WALLET_PROVIDERS, type WalletProviderInfo };

export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  chainType: ChainType | null;
  balance: number;
  avatar: string | null;
  providerName: string | null;
  isModalOpen: boolean;
  isConnecting: boolean;
  connectingProvider: string | null;
}

export interface WalletContextValue extends WalletState {
  connect: (providerId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<SignedMessageResult>;
  verifySignature: (message: string, signature: string, publicKey: string) => Promise<boolean>;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    publicKey: null,
    chainType: null,
    balance: 0,
    avatar: null,
    providerName: null,
    isModalOpen: false,
    isConnecting: false,
    connectingProvider: null,
  });

  const [activeProviderId, setActiveProviderId] = useState<string>("phantom");

  const openModal = useCallback(() => {
    setState((s) => ({ ...s, isModalOpen: true }));
  }, []);

  const closeModal = useCallback(() => {
    setState((s) => ({ ...s, isModalOpen: false }));
  }, []);

  const connect = useCallback(async (providerId = "phantom") => {
    const providerInfo =
      SUPPORTED_WALLET_PROVIDERS.find((p) => p.id === providerId) ??
      SUPPORTED_WALLET_PROVIDERS[0]!;

    setActiveProviderId(providerId);
    setState((s) => ({
      ...s,
      isConnecting: true,
      connectingProvider: providerInfo.name,
    }));

    try {
      const adapter = WalletAdapterFactory.getAdapter(providerId);
      const res = await adapter.connect();

      setState((s) => ({
        ...s,
        connected: true,
        address: res.address,
        publicKey: res.publicKey,
        chainType: res.chainType,
        balance: res.balance,
        providerName: providerInfo.name,
        isConnecting: false,
        connectingProvider: null,
        isModalOpen: false,
      }));
    } catch (err) {
      console.warn("[WalletProvider] Connection error:", err);
      setState((s) => ({
        ...s,
        isConnecting: false,
        connectingProvider: null,
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const adapter = WalletAdapterFactory.getAdapter(activeProviderId);
      await adapter.disconnect();
    } catch {}

    setState((s) => ({
      ...s,
      connected: false,
      address: null,
      publicKey: null,
      chainType: null,
      balance: 0,
      avatar: null,
      providerName: null,
      isConnecting: false,
      connectingProvider: null,
    }));
  }, [activeProviderId]);

  const signMessage = useCallback(
    async (message: string): Promise<SignedMessageResult> => {
      const adapter = WalletAdapterFactory.getAdapter(activeProviderId);
      return adapter.signMessage(message);
    },
    [activeProviderId],
  );

  const verifySignature = useCallback(
    async (message: string, signature: string, publicKey: string): Promise<boolean> => {
      const adapter = WalletAdapterFactory.getAdapter(activeProviderId);
      return adapter.verifySignature(message, signature, publicKey);
    },
    [activeProviderId],
  );

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        signMessage,
        verifySignature,
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
