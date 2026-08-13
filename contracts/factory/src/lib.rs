#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, IntoVal, Symbol, Vec,
};

mod events;
mod storage;

use storage::*;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolKey {
    pub token_0: Address,
    pub token_1: Address,
    pub fee: u32,
}

pub fn sort_tokens(token_a: Address, token_b: Address) -> (Address, Address) {
    if token_a < token_b {
        (token_a, token_b)
    } else {
        (token_b, token_a)
    }
}

#[contract]
pub struct FactoryContract;

#[contractimpl]
impl FactoryContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        pool_wasm_hash: BytesN<32>,
        fee_recipient: Address,
        protocol_fee: u32,
    ) {
        admin.require_auth();
        if is_initialized(&env) {
            panic!("already initialized");
        }
        write_admin(&env, &admin);
        write_pool_wasm_hash(&env, &pool_wasm_hash);
        write_fee_recipient(&env, &fee_recipient);
        write_protocol_fee(&env, protocol_fee);
        write_initialized(&env);
    }

    /// Deploy a new XLM/USDC pool.  Salt is derived deterministically from
    /// (token_0, token_1, fee) so no caller-supplied salt is needed.
    pub fn deploy_pool(
        env: Env,
        token_a: Address,
        token_b: Address,
        fee: u32,
        tick_spacing: i32,
        initial_sqrt_price_x64: u128,
    ) -> Address {
        let (token_0, token_1) = sort_tokens(token_a, token_b);
        let key = PoolKey {
            token_0: token_0.clone(),
            token_1: token_1.clone(),
            fee,
        };

        if get_pool(&env, &key).is_some() {
            panic!("pool exists");
        }

        let pool_wasm_hash = read_pool_wasm_hash(&env);

        // Fixed zero salt — one pool per (token_0, token_1, fee) per factory.
        let salt: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);

        let pool_address = env.deployer().with_current_contract(salt).deploy_v2(
            pool_wasm_hash,
            (
                env.current_contract_address(),
                token_0.clone(),
                token_1.clone(),
                fee,
                tick_spacing,
                initial_sqrt_price_x64,
            ),
        );

        write_pool(&env, &key, &pool_address);

        events::emit_pool_created(&env, &token_0, &token_1, fee, tick_spacing, &pool_address);

        pool_address
    }

    /// Sync a pool's on-chain price to the current market price (CoinGecko/Binance).
    /// Pass new_sqrt_price_x64 = floor(sqrt(XLM_per_USDC) * 2^64).
    /// Only the admin can call this.
    pub fn set_pool_price(env: Env, pool: Address, new_sqrt_price_x64: u128) {
        read_admin(&env).require_auth();
        let args: Vec<soroban_sdk::Val> =
            soroban_sdk::vec![&env, new_sqrt_price_x64.into_val(&env),];
        env.invoke_contract::<()>(&pool, &Symbol::new(&env, "set_price"), args);
    }

    pub fn get_pool(env: Env, token_a: Address, token_b: Address, fee: u32) -> Option<Address> {
        let (token_0, token_1) = sort_tokens(token_a, token_b);
        get_pool(
            &env,
            &PoolKey {
                token_0,
                token_1,
                fee,
            },
        )
    }

    pub fn set_fee_recipient(env: Env, recipient: Address) {
        read_admin(&env).require_auth();
        write_fee_recipient(&env, &recipient);
    }

    pub fn set_protocol_fee(env: Env, fee: u32) {
        read_admin(&env).require_auth();
        assert!(
            fee == 0 || (fee >= 4 && fee <= 10),
            "fee out of range: must be 0 or 4-10"
        );
        write_protocol_fee(&env, fee);
    }

    pub fn get_fee_recipient(env: Env) -> Address {
        read_fee_recipient(&env)
    }
    pub fn get_protocol_fee(env: Env) -> u32 {
        read_protocol_fee(&env)
    }
    pub fn get_admin(env: Env) -> Address {
        read_admin(&env)
    }
    pub fn get_pool_wasm_hash(env: Env) -> BytesN<32> {
        read_pool_wasm_hash(&env)
    }
}
