// XLM balance + native payment helpers against Horizon TESTNET.
// All @stellar/stellar-sdk imports are explicit and at the top of the file.
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import { HORIZON_TESTNET_URL, STELLAR_TESTNET_PASSPHRASE } from "./stellar-wallet";

const server = new Horizon.Server(HORIZON_TESTNET_URL);

/** True if a Horizon error is a 404 (account does not exist / not funded). */
function isAccountNotFound(err: unknown): boolean {
  const e = err as { response?: { status?: number }; name?: string };
  return e?.response?.status === 404 || e?.name === "NotFoundError";
}

/**
 * Fetch the native (XLM) balance for an address from Horizon.
 * Returns "0" when the account is not funded yet (HTTP 404).
 */
export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (err: unknown) {
    if (isAccountNotFound(err)) return "0";
    throw err;
  }
}

/** Build an unsigned native-XLM payment transaction and return its XDR. */
export async function buildPaymentXdr(
  from: string,
  to: string,
  amount: string
): Promise<string> {
  const account = await server.loadAccount(from);

  // Check if destination exists
  let destinationExists = true;
  try {
    await server.loadAccount(to);
  } catch (err) {
    if (isAccountNotFound(err)) {
      destinationExists = false;
    }
  }

  const op = destinationExists
    ? Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount,
      })
    : Operation.createAccount({
        destination: to,
        startingBalance: amount,
      });

  const tx = new TransactionBuilder(account, {
    fee: "100000", // 0.01 XLM fee
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

/** Submit a signed transaction XDR to Horizon and return its hash. */
export async function submitSignedTx(
  signedXdr: string
): Promise<{ hash: string }> {
  const tx = TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
  const res = await server.submitTransaction(tx);
  return { hash: res.hash };
}
