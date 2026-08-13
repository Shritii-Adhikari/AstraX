#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, vec, Address, Env, FromVal, IntoVal,
    Symbol, Vec,
};

mod storage;
use storage::*;

#[contract]
pub struct RouterContract;

#[contractimpl]
impl RouterContract {
    pub fn initialize(env: Env, factory: Address) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        write_factory(&env, &factory);
        write_initialized(&env);
    }

    /// Swap exact in for as much out as possible (single hop)
    pub fn exact_input_single(
        env: Env,
        token_in: Address,
        token_out: Address,
        fee: u32,
        recipient: Address,
        deadline: u64,
        amount_in: u128,
        amount_out_minimum: u128,
        sqrt_price_limit_x64: u128,
    ) -> u128 {
        check_deadline(&env, deadline);
        recipient.require_auth();

        let pool_address = get_pool_addr(&env, &token_in, &token_out, fee);

        // Determine zero_for_one by asking the pool for token_0
        let token_0: Address =
            env.invoke_contract(&pool_address, &Symbol::new(&env, "token_0"), vec![&env]);
        let zero_for_one = token_in == token_0;

        // Default price limit (just inside min/max)
        let price_limit = if sqrt_price_limit_x64 == 0 {
            if zero_for_one {
                72057594037927937u128 // MIN + 1
            } else {
                4722366482869645213695u128 // MAX - 1
            }
        } else {
            sqrt_price_limit_x64
        };

        // Approve pool to pull token_in from recipient
        token::Client::new(&env, &token_in).approve(
            &recipient,
            &pool_address,
            &(amount_in as i128),
            &200u32,
        );

        let result: soroban_sdk::Val = env.invoke_contract(
            &pool_address,
            &Symbol::new(&env, "swap"),
            vec![
                &env,
                recipient.clone().into_val(&env),
                zero_for_one.into_val(&env),
                (amount_in as i128).into_val(&env),
                price_limit.into_val(&env),
            ],
        );

        let (amount_0, amount_1): (i128, i128) = FromVal::from_val(&env, &result);

        let amount_out = if zero_for_one {
            (-amount_1) as u128
        } else {
            (-amount_0) as u128
        };

        assert!(amount_out >= amount_out_minimum, "too little received");

        env.events().publish(
            (symbol_short!("swap"), &recipient),
            (token_in, token_out, fee, amount_in, amount_out),
        );

        amount_out
    }

    /// Swap for exact out, spending at most amount_in_maximum
    pub fn exact_output_single(
        env: Env,
        token_in: Address,
        token_out: Address,
        fee: u32,
        recipient: Address,
        deadline: u64,
        amount_out: u128,
        amount_in_maximum: u128,
        sqrt_price_limit_x64: u128,
    ) -> u128 {
        check_deadline(&env, deadline);
        recipient.require_auth();

        let pool_address = get_pool_addr(&env, &token_in, &token_out, fee);

        let token_0: Address =
            env.invoke_contract(&pool_address, &Symbol::new(&env, "token_0"), vec![&env]);
        let zero_for_one = token_in == token_0;

        let price_limit = if sqrt_price_limit_x64 == 0 {
            if zero_for_one {
                72057594037927937u128
            } else {
                4722366482869645213695u128
            }
        } else {
            sqrt_price_limit_x64
        };

        token::Client::new(&env, &token_in).approve(
            &recipient,
            &pool_address,
            &(amount_in_maximum as i128),
            &200u32,
        );

        let result: soroban_sdk::Val = env.invoke_contract(
            &pool_address,
            &Symbol::new(&env, "swap"),
            vec![
                &env,
                recipient.clone().into_val(&env),
                zero_for_one.into_val(&env),
                (-(amount_out as i128)).into_val(&env),
                price_limit.into_val(&env),
            ],
        );

        let (amount_0, amount_1): (i128, i128) = FromVal::from_val(&env, &result);

        let amount_in_spent = if zero_for_one {
            amount_0 as u128
        } else {
            amount_1 as u128
        };
        assert!(amount_in_spent <= amount_in_maximum, "too much spent");
        amount_in_spent
    }

    pub fn factory(env: Env) -> Address {
        read_factory(&env)
    }

    pub fn get_pool(env: Env, token_a: Address, token_b: Address, fee: u32) -> Option<Address> {
        let factory = read_factory(&env);
        let result: soroban_sdk::Val = env.invoke_contract(
            &factory,
            &Symbol::new(&env, "get_pool"),
            vec![
                &env,
                token_a.into_val(&env),
                token_b.into_val(&env),
                fee.into_val(&env),
            ],
        );
        FromVal::from_val(&env, &result)
    }
}

fn get_pool_addr(env: &Env, token_in: &Address, token_out: &Address, fee: u32) -> Address {
    let factory = read_factory(env);
    let result: soroban_sdk::Val = env.invoke_contract(
        &factory,
        &Symbol::new(env, "get_pool"),
        vec![
            env,
            token_in.clone().into_val(env),
            token_out.clone().into_val(env),
            fee.into_val(env),
        ],
    );
    let opt: Option<Address> = FromVal::from_val(env, &result);
    opt.expect("pool not found")
}

fn check_deadline(env: &Env, deadline: u64) {
    assert!(env.ledger().timestamp() <= deadline, "deadline");
}
