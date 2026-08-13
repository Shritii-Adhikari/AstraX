#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, FromVal, IntoVal,
    Symbol, Vec,
};

mod storage;
use storage::*;

#[contracttype]
#[derive(Clone, Debug)]
pub struct PositionMetadata {
    pub pool: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: u128,
    pub owner: Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MintParams {
    pub pool: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: u128,
    pub amount_0_min: u128,
    pub amount_1_min: u128,
    pub recipient: Address,
    pub deadline: u64,
}

#[contract]
pub struct PositionManagerContract;

#[contractimpl]
impl PositionManagerContract {
    pub fn initialize(env: Env, factory: Address) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        write_factory(&env, &factory);
        write_next_id(&env, 1u128);
        write_initialized(&env);
    }

    pub fn mint(env: Env, params: MintParams) -> (u128, u128, u128, u128) {
        check_deadline(&env, params.deadline);
        params.recipient.require_auth();

        // Call pool.mint via invoke_contract
        let args = vec![
            &env,
            params.recipient.into_val(&env),
            params.tick_lower.into_val(&env),
            params.tick_upper.into_val(&env),
            params.liquidity.into_val(&env),
        ];
        let result: soroban_sdk::Val =
            env.invoke_contract(&params.pool, &Symbol::new(&env, "mint"), args);
        // The pool returns (u128, u128) — unpack it
        let pair: (u128, u128) = soroban_sdk::FromVal::from_val(&env, &result);
        let (amount_0, amount_1) = pair;

        assert!(amount_0 >= params.amount_0_min, "slippage: amount0");
        assert!(amount_1 >= params.amount_1_min, "slippage: amount1");

        let position_id = read_next_id(&env);
        write_next_id(&env, position_id + 1);

        let meta = PositionMetadata {
            pool: params.pool,
            tick_lower: params.tick_lower,
            tick_upper: params.tick_upper,
            liquidity: params.liquidity,
            owner: params.recipient.clone(),
        };
        write_position_metadata(&env, position_id, &meta);
        add_position_to_owner(&env, &params.recipient, position_id);

        env.events().publish(
            (symbol_short!("pm_mint"), &params.recipient),
            (position_id, amount_0, amount_1),
        );

        (position_id, params.liquidity, amount_0, amount_1)
    }

    pub fn decrease_liquidity(
        env: Env,
        position_id: u128,
        liquidity: u128,
        amount_0_min: u128,
        amount_1_min: u128,
        deadline: u64,
    ) -> (u128, u128) {
        check_deadline(&env, deadline);
        let meta = read_position_metadata(&env, position_id);
        meta.owner.require_auth();

        let args = vec![
            &env,
            meta.owner.clone().into_val(&env),
            meta.tick_lower.into_val(&env),
            meta.tick_upper.into_val(&env),
            liquidity.into_val(&env),
        ];
        let result: soroban_sdk::Val =
            env.invoke_contract(&meta.pool, &Symbol::new(&env, "burn"), args);
        let pair: (u128, u128) = soroban_sdk::FromVal::from_val(&env, &result);
        let (amount_0, amount_1) = pair;

        assert!(amount_0 >= amount_0_min, "slippage: amount0");
        assert!(amount_1 >= amount_1_min, "slippage: amount1");

        let mut updated = meta.clone();
        updated.liquidity = updated.liquidity.saturating_sub(liquidity);
        write_position_metadata(&env, position_id, &updated);

        (amount_0, amount_1)
    }

    pub fn collect(env: Env, position_id: u128, recipient: Address) -> (u128, u128) {
        let meta = read_position_metadata(&env, position_id);
        meta.owner.require_auth();

        let max_u128 = u128::MAX;
        let args = vec![
            &env,
            meta.owner.clone().into_val(&env),
            recipient.into_val(&env),
            meta.tick_lower.into_val(&env),
            meta.tick_upper.into_val(&env),
            max_u128.into_val(&env),
            max_u128.into_val(&env),
        ];
        let result: soroban_sdk::Val =
            env.invoke_contract(&meta.pool, &Symbol::new(&env, "collect"), args);
        let pair: (u128, u128) = soroban_sdk::FromVal::from_val(&env, &result);
        pair
    }

    pub fn burn(env: Env, position_id: u128) {
        let meta = read_position_metadata(&env, position_id);
        meta.owner.require_auth();
        assert!(meta.liquidity == 0, "liquidity not zero");

        remove_position_metadata(&env, position_id);
        remove_position_from_owner(&env, &meta.owner, position_id);

        env.events()
            .publish((symbol_short!("pm_burn"), &meta.owner), position_id);
    }

    pub fn get_position(env: Env, position_id: u128) -> PositionMetadata {
        read_position_metadata(&env, position_id)
    }

    pub fn positions_of(env: Env, owner: Address) -> Vec<u128> {
        get_owner_positions(&env, &owner)
    }

    pub fn next_id(env: Env) -> u128 {
        read_next_id(&env)
    }
}

fn check_deadline(env: &Env, deadline: u64) {
    assert!(env.ledger().timestamp() <= deadline, "deadline");
}
