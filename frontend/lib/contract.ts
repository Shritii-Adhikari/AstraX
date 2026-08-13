// Contract interaction layer.
//
// - `callContractFunction` is the generic write path (load account → build
//   invokeContractFunction op → simulate → assemble → sign → submit). It is
//   used by scripts/tests and by the admin stubs below.
// - The `readPool*` helpers are the read path used by the live frontend; they
//   simulate (no signature/fee) against the deployed pool.
//
// STEP 4 cross-check: every public function of contracts/pool/src/lib.rs has a
// counterpart here or in ./transactions.ts — see CONTRACT_FUNCTION_MAP.
import { server, NETWORK_PASSPHRASE as networkPassphrase, StellarSdk } from "./stellar/client";
import { simulateContractRead, parseSlot0, parseU128 } from "./stellar";
import { POOL_ADDRESS } from "./stellar/contracts";

const { Contract, TransactionBuilder, Keypair, BASE_FEE, scValToNative, xdr } =
  StellarSdk;

/** Default contract this module targets (the XLM/USDC pool). */
export const CONTRACT_ID = POOL_ADDRESS;

/**
 * Generic contract write: load source account, invoke a contract function,
 * simulate, assemble, sign with the given secret, and submit. Returns the
 * RPC send response. Intended for Node/scripts/tests (browser flows sign via
 * Freighter — see ./transactions.ts + useWallet).
 */
export async function callContractFunction(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  signerSecret: string
) {
  const keypair = Keypair.fromSecret(signerSecret);
  const source = await server.getAccount(keypair.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const assembled = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  assembled.sign(keypair);
  return server.sendTransaction(assembled);
}

// ─────────────────────────── Pool read helpers ──────────────────────────────

export interface PoolSlot0 {
  sqrtPriceX64: bigint;
  tick: number;
  feeProtocol: number;
  unlocked: boolean;
}

/** pool.slot0() — current price, tick, protocol fee, lock flag. */
export async function readPoolSlot0(
  contractId: string = CONTRACT_ID
): Promise<PoolSlot0 | null> {
  const v = await simulateContractRead(contractId, "slot0", []);
  return v ? parseSlot0(v) : null;
}

/** pool.liquidity() — active in-range liquidity. */
export async function readPoolLiquidity(
  contractId: string = CONTRACT_ID
): Promise<bigint> {
  const v = await simulateContractRead(contractId, "liquidity", []);
  return v ? parseU128(v) : 0n;
}

/** pool.fee() — fee tier in hundredths of a bip (3000 = 0.3%). */
export async function readPoolFee(
  contractId: string = CONTRACT_ID
): Promise<number> {
  const v = await simulateContractRead(contractId, "fee", []);
  return v ? Number(scValToNative(v)) : 0;
}

/** pool.tick_spacing(). */
export async function readTickSpacing(
  contractId: string = CONTRACT_ID
): Promise<number> {
  const v = await simulateContractRead(contractId, "tick_spacing", []);
  return v ? Number(scValToNative(v)) : 0;
}

/** pool.token_0() / pool.token_1() — pair token addresses. */
export async function readToken0(
  contractId: string = CONTRACT_ID
): Promise<string | null> {
  const v = await simulateContractRead(contractId, "token_0", []);
  return v ? String(scValToNative(v)) : null;
}
export async function readToken1(
  contractId: string = CONTRACT_ID
): Promise<string | null> {
  const v = await simulateContractRead(contractId, "token_1", []);
  return v ? String(scValToNative(v)) : null;
}

/** pool.fee_growth_global_0() / _1() — accumulated fee growth (Q64.64). */
export async function readFeeGrowthGlobal0(
  contractId: string = CONTRACT_ID
): Promise<bigint> {
  const v = await simulateContractRead(contractId, "fee_growth_global_0", []);
  return v ? parseU128(v) : 0n;
}
export async function readFeeGrowthGlobal1(
  contractId: string = CONTRACT_ID
): Promise<bigint> {
  const v = await simulateContractRead(contractId, "fee_growth_global_1", []);
  return v ? parseU128(v) : 0n;
}

/** pool.get_tick_info(tick). */
export async function readTickInfo(tick: number, contractId: string = CONTRACT_ID) {
  const v = await simulateContractRead(contractId, "get_tick_info", [
    xdr.ScVal.scvI32(tick),
  ]);
  return v ? scValToNative(v) : null;
}

// ─────────────────── Admin write stubs (generic write path) ──────────────────
// These mirror the pool's admin functions so every contract method has a
// visible frontend counterpart. They use callContractFunction (secret signer).

/** pool.set_price(new_sqrt_price_x64) — admin only. */
export function setPoolPrice(newSqrtPriceX64: bigint, signerSecret: string) {
  return callContractFunction(
    CONTRACT_ID,
    "set_price",
    [u128(newSqrtPriceX64)],
    signerSecret
  );
}

/** pool.set_fee_protocol(fee_protocol) — admin only. */
export function setFeeProtocol(feeProtocol: number, signerSecret: string) {
  return callContractFunction(
    CONTRACT_ID,
    "set_fee_protocol",
    [xdr.ScVal.scvU32(feeProtocol)],
    signerSecret
  );
}

function u128(value: bigint): StellarSdk.xdr.ScVal {
  return xdr.ScVal.scvU128(
    new xdr.UInt128Parts({
      hi: xdr.Uint64.fromString((value >> 64n).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    })
  );
}

/**
 * STEP 4 — contract ⇄ frontend mapping. Every pool public function has a
 * counterpart: a read helper here, an admin stub here, or a tx builder in
 * ./transactions.ts (browser/Freighter signing).
 */
export const CONTRACT_FUNCTION_MAP = {
  // reads (this file)
  slot0: "readPoolSlot0",
  liquidity: "readPoolLiquidity",
  fee: "readPoolFee",
  tick_spacing: "readTickSpacing",
  token_0: "readToken0",
  token_1: "readToken1",
  fee_growth_global_0: "readFeeGrowthGlobal0",
  fee_growth_global_1: "readFeeGrowthGlobal1",
  get_tick_info: "readTickInfo",
  get_position_info: "usePositions hook (simulateContractRead)",
  // writes (transactions.ts — Freighter signed)
  swap: "transactions.buildSwapTx",
  mint: "transactions.buildMintTx",
  burn: "transactions.buildDecreaseLiquidityTx",
  collect: "transactions.buildCollectTx",
  // admin writes (this file — secret signed)
  set_price: "setPoolPrice",
  set_fee_protocol: "setFeeProtocol",
  collect_protocol: "callContractFunction(\"collect_protocol\")",
} as const;
