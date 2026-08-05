import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  avatar: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const MOCK_ADDRESS = "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0,
    avatar: null,
  });

  const connect = useCallback(() => {
    // Simulated wallet connection for the prototype.
    setState({
      connected: true,
      address: MOCK_ADDRESS,
      balance: 12.45,
      avatar: null,
    });
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      balance: 0,
      avatar: null,
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
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
