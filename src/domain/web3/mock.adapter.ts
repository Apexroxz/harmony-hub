import type {
  ChainType,
  IBlockchainWalletAdapter,
  SignedMessageResult,
  WalletConnectionResult,
} from "./wallet.types";

export class MockDevWalletAdapter implements IBlockchainWalletAdapter {
  public readonly chainType: ChainType = "mock";
  public readonly providerId = "demo";
  private connectedAddress: string | null = null;

  public async connect(): Promise<WalletConnectionResult> {
    const mockAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA";
    this.connectedAddress = mockAddress;
    return {
      address: mockAddress,
      publicKey: mockAddress,
      chainType: "mock",
      balance: 25.0,
    };
  }

  public async disconnect(): Promise<void> {
    this.connectedAddress = null;
  }

  public getAddress(): string | null {
    return this.connectedAddress;
  }

  public async getBalance(): Promise<number> {
    return 25.0;
  }

  public async signMessage(message: string): Promise<SignedMessageResult> {
    const timestamp = Date.now();
    const fullMessage = `${message}\nTimestamp: ${timestamp}`;
    const sig = Buffer.from(`MOCK_SIG:${message}:${timestamp}`).toString("base64url");
    return {
      signature: sig,
      publicKey: this.connectedAddress || "7xKXtg2CW87d97TXJSDpbD5jBkheTuwA",
      message: fullMessage,
      timestamp,
    };
  }

  public async verifySignature(
    message: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    return Boolean(message && signature && publicKey);
  }

  public async checkTokenOwnership(): Promise<number> {
    return 1;
  }
}
