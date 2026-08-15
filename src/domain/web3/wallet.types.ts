export type ChainType = "solana" | "evm" | "mock";

export interface WalletProviderInfo {
  id: string;
  name: string;
  chain: string;
  chainType: ChainType;
  description: string;
  gradient: string;
  badge?: string;
  icon?: string;
}

export interface WalletConnectionResult {
  address: string;
  publicKey: string;
  chainType: ChainType;
  balance: number;
}

export interface SignedMessageResult {
  signature: string;
  publicKey: string;
  message: string;
  timestamp: number;
}

export interface IBlockchainWalletAdapter {
  readonly chainType: ChainType;
  readonly providerId: string;
  connect(): Promise<WalletConnectionResult>;
  disconnect(): Promise<void>;
  getAddress(): string | null;
  getBalance(): Promise<number>;
  signMessage(message: string): Promise<SignedMessageResult>;
  verifySignature(message: string, signature: string, publicKey: string): Promise<boolean>;
  checkTokenOwnership(walletAddress: string, contractOrMintAddress: string): Promise<number>;
}
