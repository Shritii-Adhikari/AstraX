import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Contract,
  Account,
  Asset,
  Operation,
  xdr,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { RPC_URL as SOROBAN_RPC_URL, HORIZON_URL, NETWORK_PASSPHRASE } from "./stellar/network";

type RpcServer = InstanceType<typeof SorobanRpc.Server>;
type GetTransactionResponse = Awaited<ReturnType<RpcServer["getTransaction"]>>;

let _rpc: RpcServer | null = null;

export function getRpc(): RpcServer {
  if (!_rpc) {
    _rpc = new SorobanRpc.Server(SOROBAN_RPC_URL, {
      allowHttp: !SOROBAN_RPC_URL.startsWith("https://"),
    });
  }
  return _rpc;
}

export function getHorizonUrl(): string {
  return HORIZON_URL;
}

export async function getLatestLedger(): Promise<number> {
  const server = getRpc();
  const ledger = await server.getLatestLedger();
  return ledger.sequence;
}

export async function buildContractTx(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerAddress: string
) {
  const server = getRpc();
  const contract = new Contract(contractId);
  const account = await server.getAccount(signerAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  return SorobanRpc.assembleTransaction(tx, sim).build();
}

/**
 * Classic Stellar assets wrapped by a Stellar Asset Contract (e.g. this
 * deployment's USDC) can only be transferred to accounts that already hold a
 * trustline for them — `transfer`/`transfer_from` on the SAC fails with
 * "trustline entry is missing for account" otherwise. Check this before
 * attempting a transfer so the UI can offer to establish the trustline
 * instead of surfacing a raw contract error.
 */
export async function hasTrustline(
  address: string,
  assetCode: string,
  issuer: string
): Promise<boolean> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!res.ok) return false;
  const account = await res.json();
  type HorizonBalance = { asset_code?: string; asset_issuer?: string };
  return (account.balances ?? []).some(
    (b: HorizonBalance) => b.asset_code === assetCode && b.asset_issuer === issuer
  );
}

/** Builds a `changeTrust` transaction so the wallet can hold the given classic asset. */
export async function buildTrustlineTx(
  walletAddress: string,
  assetCode: string,
  issuer: string
): Promise<string> {
  const server = getRpc();
  const account = await server.getAccount(walletAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(assetCode, issuer) }))
    .setTimeout(300)
    .build();
  return tx.toXDR();
}

// Valid 56-char public key used as a throwaway source for read-only simulations.
// The account need not exist on-chain; Soroban RPC accepts any valid strkey for simulation.
const DUMMY_ACCOUNT = new Account(
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "0"
);

export async function simulateContractRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal | null> {
  const server = getRpc();
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(DUMMY_ACCOUNT, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }

  const successSim = sim as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  return successSim.result?.retval ?? null;
}

export async function submitTransaction(
  signedXdr: string
): Promise<SorobanRpc.Api.GetSuccessfulTransactionResponse & { hash: string }> {
  const server = getRpc();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(tx);

  if (result.status === "ERROR") {
    throw new Error(`Submit error: ${JSON.stringify(result.errorResult)}`);
  }

  let response: GetTransactionResponse;
  let attempts = 0;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    response = await server.getTransaction(result.hash);
    attempts++;
    if (attempts > 30) throw new Error("Transaction timeout");
  } while (response.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND);

  if (response.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error("Transaction failed on-chain");
  }

  // Narrow: at this point response can only be the SUCCESS variant
  // (NOT_FOUND excluded by the loop condition, FAILED excluded above).
  if (response.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Unexpected transaction status after submit");
  }

  return {
    ...response,
    hash: result.hash,
  };
}

export function bigintToU128(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvU128(
    new xdr.UInt128Parts({
      hi: xdr.Uint64.fromString((value >> 64n).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    })
  );
}

export function bigintToI128(value: bigint): xdr.ScVal {
  const abs = value < 0n ? -value : value;
  const hi = abs >> 64n;
  const lo = abs & 0xffffffffffffffffn;
  if (value < 0n) {
    return xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        hi: xdr.Int64.fromString((-hi - (lo > 0n ? 1n : 0n)).toString()),
        lo: xdr.Uint64.fromString(
          lo > 0n ? (0x10000000000000000n - lo).toString() : "0"
        ),
      })
    );
  }
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(hi.toString()),
      lo: xdr.Uint64.fromString(lo.toString()),
    })
  );
}

export function addressToScVal(address: string): xdr.ScVal {
  return nativeToScVal(address, { type: "address" });
}

export function boolToScVal(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

export function i32ToScVal(value: number): xdr.ScVal {
  return xdr.ScVal.scvI32(value);
}

export function u32ToScVal(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

export function u64ToScVal(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvU64(xdr.Uint64.fromString(value.toString()));
}

export function parseU128(scVal: xdr.ScVal): bigint {
  try {
    const native = scValToNative(scVal);
    return BigInt(String(native));
  } catch {
    return 0n;
  }
}

export function parseSlot0(scVal: xdr.ScVal): {
  sqrtPriceX64: bigint;
  tick: number;
  feeProtocol: number;
  unlocked: boolean;
} {
  try {
    const obj = scValToNative(scVal) as Record<string, unknown>;
    return {
      sqrtPriceX64: BigInt(
        String(obj.sqrt_price_x64 ?? obj.sqrtPriceX64 ?? "0")
      ),
      tick: Number(obj.tick ?? 0),
      feeProtocol: Number(obj.fee_protocol ?? obj.feeProtocol ?? 0),
      unlocked: Boolean(obj.unlocked ?? true),
    };
  } catch {
    return { sqrtPriceX64: 0n, tick: 0, feeProtocol: 0, unlocked: true };
  }
}
