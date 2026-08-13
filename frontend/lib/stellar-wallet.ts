// Stellar Multi-Wallet Integration (Stellar TESTNET).
// Uses `@creit.tech/stellar-wallets-kit` to support Freighter, Albedo, xBull, and Lobstr.
import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";

export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";

let isKitInitialized = false;

/** Initialize the StellarWalletsKit on the client side once. */
export function initWalletKit() {
  if (typeof window === "undefined") return;
  if (isKitInitialized) return;

  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new xBullModule(),
      new LobstrModule(),
    ],
    network: Networks.TESTNET,
  });
  isKitInitialized = true;
}

/** Check if Freighter extension is available in the browser. */
export async function detectFreighter(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    return !!result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect to a specific wallet.
 * Stores the wallet selection in localStorage and returns the address.
 */
export async function connectWallet(walletId: "freighter" | "albedo" | "xbull" | "lobstr"): Promise<string> {
  initWalletKit();

  try {
    StellarWalletsKit.setWallet(walletId);
    const { address } = await StellarWalletsKit.fetchAddress();
    if (!address) throw new Error("Wallet returned no address");

    localStorage.setItem("selectedWalletId", walletId);
    return address;
  } catch (err) {
    throw new Error((err as Error)?.message || `Failed to connect to ${walletId}`);
  }
}

/** Retrieve the connected address from the kit if already authorized. */
export async function getWalletAddress(): Promise<{ address: string | null; walletId: string | null }> {
  if (typeof window === "undefined") return { address: null, walletId: null };

  const savedWalletId = localStorage.getItem("selectedWalletId");
  if (!savedWalletId) return { address: null, walletId: null };

  initWalletKit();
  try {
    StellarWalletsKit.setWallet(savedWalletId);
    // Silent check or fetchAddress
    const { address } = await StellarWalletsKit.getAddress();
    return { address: address || null, walletId: savedWalletId };
  } catch {
    // If getAddress fails, we try a fetchAddress
    try {
      const { address } = await StellarWalletsKit.fetchAddress();
      return { address: address || null, walletId: savedWalletId };
    } catch {
      localStorage.removeItem("selectedWalletId");
      return { address: null, walletId: null };
    }
  }
}

/** Sign a transaction XDR with the currently selected wallet. */
export async function signTx(xdr: string, walletAddress: string): Promise<string> {
  initWalletKit();

  const savedWalletId = localStorage.getItem("selectedWalletId");
  if (!savedWalletId) {
    throw new Error("No wallet connected. Please connect a wallet first.");
  }

  StellarWalletsKit.setWallet(savedWalletId);

  try {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      address: walletAddress,
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    });
    return signedTxXdr;
  } catch (err) {
    throw new Error((err as Error)?.message || "Transaction signing rejected or failed.");
  }
}
