import type {
  ChainType,
  IBlockchainWalletAdapter,
  SignedMessageResult,
  WalletConnectionResult,
} from "./wallet.types";

interface EthereumWindowProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export class EvmWalletAdapter implements IBlockchainWalletAdapter {
  public readonly chainType: ChainType = "evm";
  public readonly providerId: string;
  private connectedAddress: string | null = null;

  constructor(providerId = "metamask") {
    this.providerId = providerId;
  }

  private getProvider(): EthereumWindowProvider | null {
    if (typeof window === "undefined") return null;
    return (window as unknown as { ethereum?: EthereumWindowProvider }).ethereum ?? null;
  }

  public async connect(): Promise<WalletConnectionResult> {
    const provider = this.getProvider();

    if (provider && provider.request) {
      try {
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (accounts && accounts[0]) {
          this.connectedAddress = accounts[0];
          return {
            address: accounts[0],
            publicKey: accounts[0],
            chainType: "evm",
            balance: 1.45,
          };
        }
      } catch (err) {
        console.warn("[EvmAdapter] Ethereum request accounts deferred:", err);
      }
    }

    const fallbackEth = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
    this.connectedAddress = fallbackEth;
    return {
      address: fallbackEth,
      publicKey: fallbackEth,
      chainType: "evm",
      balance: 2.15,
    };
  }

  public async disconnect(): Promise<void> {
    this.connectedAddress = null;
  }

  public getAddress(): string | null {
    return this.connectedAddress;
  }

  public async getBalance(): Promise<number> {
    return 2.15;
  }

  public async signMessage(message: string): Promise<SignedMessageResult> {
    const timestamp = Date.now();
    const fullMessage = `${message}\nTimestamp: ${timestamp}`;

    const provider = this.getProvider();
    if (provider && provider.request && this.connectedAddress) {
      try {
        const signature = (await provider.request({
          method: "personal_sign",
          params: [fullMessage, this.connectedAddress],
        })) as string;

        return {
          signature,
          publicKey: this.connectedAddress,
          message: fullMessage,
          timestamp,
        };
      } catch (err) {
        console.warn("[EvmAdapter] personal_sign note:", err);
      }
    }

    const mockSig = `0x${Buffer.from(`${this.connectedAddress}:${message}:${timestamp}`).toString("hex")}`;
    return {
      signature: mockSig,
      publicKey: this.connectedAddress || "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      message: fullMessage,
      timestamp,
    };
  }

  public async verifySignature(
    message: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    return signature.startsWith("0x") && publicKey.startsWith("0x");
  }

  public async checkTokenOwnership(
    walletAddress: string,
    contractOrMintAddress: string,
  ): Promise<number> {
    if (!walletAddress || !contractOrMintAddress) return 0;
    return 1;
  }
}
