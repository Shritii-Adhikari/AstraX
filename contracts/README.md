# StellarSwap Contracts — Concentrated Liquidity DEX on Soroban

A Uniswap-V3-style **Concentrated Liquidity Market Maker (CLMM)** implemented for
Stellar **Soroban**. Liquidity providers supply capital within custom price
ranges (ticks); swappers trade against the active liquidity at the current tick.

## Workspace layout

```
contracts/
├── Cargo.toml            # virtual workspace (5 members, shared release profile)
├── Cargo.lock            # pinned dependency graph
├── Makefile              # build / test / fmt / lint / optimize / deploy
├── README.md             # this file
├── factory/              # pool registry + deployer
│   └── src/{lib,storage,events}.rs
├── pool/                 # core CLMM engine
│   └── src/{lib,swap,position,tick,tick_bitmap,storage,events}.rs
│       └── math/{fixed_point,sqrt_price,liquidity}.rs
│       └── test.rs       # unit + integration tests (soroban_sdk::testutils)
├── position_manager/     # position lifecycle wrapper (mint/collect/burn)
│   └── src/{lib,storage}.rs
├── router/               # swap routing entrypoint
│   └── src/{lib,storage}.rs
└── user_profile/         # user profile registry contract
    └── src/lib.rs
```

## The five contracts

| Contract | Responsibility | Key public functions |
|---|---|---|
| **factory** | Deploys pools from a stored wasm hash, keeps the `(token0, token1, fee) → pool` registry, owns protocol-fee config. | `initialize`, `deploy_pool`, `get_pool`, `set_pool_price`, `set_protocol_fee`, `set_fee_recipient`, `get_admin` |
| **pool** | Core CLMM: tick math, swaps, liquidity, fee growth accounting. | `swap`, `mint`, `burn`, `collect`, `slot0`, `liquidity`, `get_tick_info`, `get_position_info`, `token_0`, `token_1`, `fee`, `tick_spacing` |
| **position_manager** | Wraps pool positions behind stable integer position IDs and per-owner enumeration. | `initialize`, `mint`, `decrease_liquidity`, `collect`, `burn`, `get_position`, `positions_of`, `next_id` |
| **router** | User-facing swap entrypoint; resolves the pool via the factory and executes single-hop swaps with slippage bounds. | `initialize`, `exact_input_single`, `exact_output_single`, `get_pool`, `factory` |
| **user_profile** | User Profile registry enabling reads and writes of users' on-chain nickname profiles. | `get_profile`, `save_profile` |

## Inter-contract communication

The contracts compose on-chain rather than duplicating logic:

```
            deploy_pool (deploy_v2 + __constructor)
 factory ───────────────────────────────────────────────►  pool
    ▲  registry: get_pool(token0,token1,fee)                  ▲
    │                                                         │ pool.swap(...)
 router.exact_input_single ──── get_pool ──── factory        │
    └─────────────────────────────────────────── pool.swap ──┘

 position_manager.mint/burn/collect ── pool.mint / pool.burn / pool.collect ──► pool
                                    └─ factory.get_pool to resolve the pool ──► factory
```

- **factory → pool**: `deploy_pool` deploys a new pool instance from the stored
  pool wasm hash and invokes its `__constructor` with the sorted token pair,
  fee, tick spacing and initial price.
- **router → factory → pool**: the router looks the pool up in the factory
  registry, then calls `pool.swap` with a computed `sqrt_price_limit` for
  slippage protection.
- **position_manager → pool**: mint/decrease/collect/burn proxy into the pool's
  position accounting and forward token transfers, exposing simple position IDs.

## Events

Each state-changing action emits a structured event consumed by the frontend
(`events.rs` in `pool` and `factory`): pool `swap`, `mint`, `burn`, `collect`,
and factory `pool_created`. See the root `readme.md` → *Event Streaming
Architecture* for the frontend subscription model.

## Build, test, deploy

Prerequisites: Rust stable, the `wasm32-unknown-unknown` target, and the
[Stellar CLI](https://developers.stellar.org/docs/tools/cli) (`stellar`).

```bash
rustup target add wasm32-unknown-unknown

make build      # cargo build --target wasm32-unknown-unknown --release
make test       # cargo test  (see test output below)
make fmt        # cargo fmt --all
make lint       # cargo clippy --all-targets -- -D warnings
make optimize   # stellar contract optimize each wasm
```

Deploy a single contract (requires a funded testnet secret):

```bash
make deploy CONTRACT=pool STELLAR_SECRET_KEY=S...XYZ
# or directly:
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/pool.wasm \
  --source $STELLAR_SECRET_KEY \
  --network testnet
```

The end-to-end deploy + wiring (factory → pool → router → position_manager,
plus pool initialization) is automated in [`../scripts/redeploy.sh`](../scripts/redeploy.sh).

### Test output

```
running 7 tests
test test::test_mul_div_ceil_rounds_up ... ok
test test::test_liquidity_amounts_roundtrip ... ok
test test::test_mul_div_basic ... ok
test test::test_sqrt_u128 ... ok
test test::test_wide_mul_high_low ... ok
test test::test_tick_sqrt_price_roundtrip ... ok
test test::test_pool_constructor_and_reads ... ok

test result: ok. 7 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

- 6 unit tests cover the Q64.64 fixed-point math and tick ↔ sqrt-price
  conversions that swap/liquidity correctness depends on.
- 1 integration test (`testutils`) deploys the pool in a test `Env` and verifies
  the constructor wiring and `slot0` reads.

## Environment variables

| Variable | Purpose |
|---|---|
| `STELLAR_SECRET_KEY` | Funded testnet secret (`S...`) used to sign deploys. |
| `STELLAR_NETWORK` | Target network, e.g. `testnet`. |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint (`https://soroban-testnet.stellar.org`). |
| `NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` for testnet. |

## Deployed addresses (Stellar testnet)

| Contract | Address |
|---|---|
| Factory | `CCDUWTVMG6J4V6SZJBWKO5E24IEYHZEHXJZNIVKQURFN6DATWISOL72T` |
| Pool (XLM/USDC, 0.3%) | `CBR7MAQPM35KPK3ULM4FBLEQMQFJZC6N7YWXMPWPYWVPOL2OVNKKBPQV` |
| Router | `CBJR47MFKAATLVITCHAYDXEML4FB4HVTZXK4DPZQPWYNN3AG4GJU3ERD` |
| Position Manager | `CDARU3KCM2CKQLQ74V4NYJ6V5X6Q4IXLKJGSDEIOLEQAUOAYUQ27QKBH` |
| User Profile | `CDCTJGULUEJSL3DBJQYD7DVQEA52J7QZDGY5EPDVIODBJQW532O3675U` |
| XLM (SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| USDC (SAC) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

Inspect any contract on [stellar.expert testnet explorer](https://stellar.expert/explorer/testnet).
