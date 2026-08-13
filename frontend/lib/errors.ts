// Structured Stellar and Soroban error handling & recovery system.

export type StellarErrorType =
  | "WALLET_NOT_INSTALLED"
  | "USER_REJECTED"
  | "INSUFFICIENT_BALANCE"
  | "WRONG_NETWORK"
  | "WALLET_LOCKED"
  | "WALLET_DISCONNECTED"
  | "RPC_UNAVAILABLE"
  | "TRUSTLINE_MISSING"
  | "UNKNOWN";

export interface StellarErrorDetails {
  type: StellarErrorType;
  title: string;
  message: string;
  recovery: string;
}

export class StellarError extends Error {
  public type: StellarErrorType;
  public title: string;
  public recovery: string;
  public originalError: unknown;

  constructor(details: StellarErrorDetails, originalError?: unknown) {
    super(details.message);
    this.name = "StellarError";
    this.type = details.type;
    this.title = details.title;
    this.recovery = details.recovery;
    this.originalError = originalError;
  }
}

export interface HorizonErrorResponse {
  message?: string;
  response?: {
    data?: {
      extras?: {
        result_codes?: Record<string, unknown> | string[];
      };
    };
  };
}

/**
 * Parse any error thrown by a wallet kit, Horizon client, or Soroban RPC server,
 * mapping it to a human-readable StellarError with recovery actions.
 */
export function parseStellarError(err: Error | HorizonErrorResponse | null | undefined): StellarError {
  if (err instanceof StellarError) return err;

  const rawMessage = (err as { message?: string })?.message || String(err);
  const rawString = JSON.stringify(err).toLowerCase() + " " + rawMessage.toLowerCase();

  // 1. Wallet Not Installed
  if (
    rawString.includes("not detected") ||
    rawString.includes("install") ||
    rawString.includes("no wallet has been connected")
  ) {
    return new StellarError({
      type: "WALLET_NOT_INSTALLED",
      title: "Wallet Not Available",
      message: "The requested Stellar wallet extension could not be detected.",
      recovery: "Please make sure your wallet extension is installed and enabled, or try a different wallet option.",
    }, err);
  }

  // 2. User Rejected
  if (
    rawString.includes("rejected") ||
    rawString.includes("reject") ||
    rawString.includes("cancel") ||
    rawString.includes("declined") ||
    rawString.includes("user abort")
  ) {
    return new StellarError({
      type: "USER_REJECTED",
      title: "Transaction Cancelled",
      message: "You declined the request in your wallet extension.",
      recovery: "To proceed, click retry and approve the transaction signature request in your wallet popup.",
    }, err);
  }

  // 3. Insufficient XLM Balance
  if (
    rawString.includes("insufficient") ||
    rawString.includes("underfunded") ||
    rawString.includes("op_underfunded") ||
    rawString.includes("low balance") ||
    rawString.includes("tx_insufficient_balance")
  ) {
    return new StellarError({
      type: "INSUFFICIENT_BALANCE",
      title: "Insufficient XLM Balance",
      message: "Your connected account does not have enough XLM to pay for the transaction or gas fees.",
      recovery: "Get free Testnet XLM by funding your address on the Stellar Friendbot faucet, or transfer XLM into your wallet.",
    }, err);
  }

  // 4. Wrong Network
  if (
    rawString.includes("wrong network") ||
    rawString.includes("network mismatch") ||
    rawString.includes("unsupported network")
  ) {
    return new StellarError({
      type: "WRONG_NETWORK",
      title: "Incorrect Network",
      message: "Your wallet is set to a different network than this application.",
      recovery: "Open your wallet settings and switch the active network to Stellar Testnet to perform operations.",
    }, err);
  }

  // 5. Wallet Locked
  if (
    rawString.includes("wallet locked") ||
    rawString.includes("wallet is locked") ||
    rawString.includes("unlock your wallet") ||
    rawString.includes("not logged in")
  ) {
    return new StellarError({
      type: "WALLET_LOCKED",
      title: "Wallet Locked",
      message: "Your wallet extension is currently locked or requires login.",
      recovery: "Click your wallet extension icon in your browser toolbar, enter your password to unlock it, and then try again.",
    }, err);
  }

  // 6. Trustline Missing (Common classic asset wrapping issue)
  if (
    rawString.includes("trustline") ||
    rawString.includes("missing trustline") ||
    rawString.includes("op_no_trust")
  ) {
    return new StellarError({
      type: "TRUSTLINE_MISSING",
      title: "Trustline Required",
      message: "Your account does not hold a trustline for the asset you are attempting to receive (e.g. USDC).",
      recovery: "You must establish a trustline for this token in your wallet or DEX dashboard before receiving it.",
    }, err);
  }

  // 7. RPC / Horizon Server Issues
  if (
    rawString.includes("rpc") ||
    rawString.includes("horizon") ||
    rawString.includes("timeout") ||
    rawString.includes("fetch failed") ||
    rawString.includes("network error") ||
    rawString.includes("500") ||
    rawString.includes("502") ||
    rawString.includes("503")
  ) {
    return new StellarError({
      type: "RPC_UNAVAILABLE",
      title: "Stellar RPC Down",
      message: "The Stellar Horizon or Soroban RPC node did not respond to our request.",
      recovery: "Stellar Testnet nodes can occasionally experience downtime. Please wait a few seconds and click retry.",
    }, err);
  }

  // 8. Wallet Disconnected
  if (rawString.includes("disconnected") || rawString.includes("connect your wallet")) {
    return new StellarError({
      type: "WALLET_DISCONNECTED",
      title: "Wallet Disconnected",
      message: "Your wallet is not connected to this application.",
      recovery: "Click 'Connect Wallet' at the top of the page, authorize the connection, and try the operation again.",
    }, err);
  }

  // 9. Fallback Unknown
  // Dig out transaction result codes if available
  const resultCodes = (err as HorizonErrorResponse)?.response?.data?.extras?.result_codes;
  const errorDetails = resultCodes ? `Result codes: ${JSON.stringify(resultCodes)}` : rawMessage;

  return new StellarError({
    type: "UNKNOWN",
    title: "Blockchain Error",
    message: `The blockchain transaction failed. details: ${errorDetails}`,
    recovery: "Review the transaction details, ensure your wallet is active on Testnet with sufficient funds, and try again.",
  }, err);
}
