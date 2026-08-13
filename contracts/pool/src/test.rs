#![cfg(test)]
//! Unit + integration tests for the CLMM pool contract.
//!
//! - Pure math unit tests exercise the Q64.64 fixed-point and tick/sqrt-price
//!   conversions that the swap/liquidity logic depends on.
//! - The integration test deploys the contract in a `soroban_sdk` test `Env`
//!   (via `testutils`) and verifies the constructor wires storage correctly and
//!   the public read methods return the expected slot0 / metadata.

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::math::fixed_point::{mul_div, mul_div_ceil, sqrt_u128, wide_mul, Q64};
use crate::math::liquidity::{get_amounts_for_liquidity, get_liquidity_for_amounts};
use crate::math::sqrt_price::{sqrt_price_to_tick, tick_to_sqrt_price_x64};
use crate::{PoolContract, PoolContractClient};

// ───────────────────────── Unit tests: fixed-point math ─────────────────────

#[test]
fn test_mul_div_basic() {
    assert_eq!(mul_div(6, 7, 3), 14);
    assert_eq!(mul_div(0, 100, 7), 0);
    // 256-bit intermediate path: (2^64 * 2^64) / 2^64 == 2^64
    assert_eq!(mul_div(Q64, Q64, Q64), Q64);
}

#[test]
fn test_mul_div_ceil_rounds_up() {
    assert_eq!(mul_div(7, 1, 2), 3); // floor
    assert_eq!(mul_div_ceil(7, 1, 2), 4); // ceil
    assert_eq!(mul_div_ceil(8, 1, 2), 4); // exact divides, no rounding
}

#[test]
fn test_sqrt_u128() {
    assert_eq!(sqrt_u128(0), 0);
    assert_eq!(sqrt_u128(1), 1);
    assert_eq!(sqrt_u128(144), 12);
    assert_eq!(sqrt_u128(1_000_000), 1_000);
}

#[test]
fn test_wide_mul_high_low() {
    // 2^64 * 2^64 = 2^128  ->  hi = 1, lo = 0
    let (hi, lo) = wide_mul(1u128 << 64, 1u128 << 64);
    assert_eq!(hi, 1);
    assert_eq!(lo, 0);
}

// ───────────────────────── Unit tests: tick / price math ────────────────────

#[test]
fn test_tick_sqrt_price_roundtrip() {
    // tick 0 maps to exactly Q64 (price 1.0)
    assert_eq!(tick_to_sqrt_price_x64(0), Q64);
    assert_eq!(sqrt_price_to_tick(Q64), 0);

    for &t in &[10i32, -10, 1_000, -1_000, 100_000, -100_000] {
        let sp = tick_to_sqrt_price_x64(t);
        let back = sqrt_price_to_tick(sp);
        assert!((back - t).abs() <= 2, "tick {} round-trips to {}", t, back);
    }
}

#[test]
fn test_liquidity_amounts_roundtrip() {
    let sp_lower = tick_to_sqrt_price_x64(-100);
    let sp_upper = tick_to_sqrt_price_x64(100);
    let sp_cur = tick_to_sqrt_price_x64(0);
    let l = 1_000_000_000u128;

    // In-range position requires both tokens.
    let (a0, a1) = get_amounts_for_liquidity(sp_cur, sp_lower, sp_upper, l);
    assert!(a0 > 0 && a1 > 0, "in-range position needs both tokens");

    // Recomputing L from the amounts returns ~the same liquidity (rounding down).
    let l_back = get_liquidity_for_amounts(sp_cur, sp_lower, sp_upper, a0, a1);
    assert!(l_back <= l, "liquidity should not increase on round-trip");
    assert!(l_back > l * 95 / 100, "liquidity round-trip within 5%");
}

// ───────────────────────── Integration test: deploy + reads ─────────────────

#[test]
fn test_pool_constructor_and_reads() {
    let env = Env::default();
    let factory = Address::generate(&env);
    let token_0 = Address::generate(&env);
    let token_1 = Address::generate(&env);
    let fee = 3000u32;
    let tick_spacing = 10i32;
    let initial_sqrt_price = tick_to_sqrt_price_x64(0);

    // Deploy the pool with constructor args (Soroban deploy_v2 style).
    let pool_id = env.register(
        PoolContract,
        (
            factory.clone(),
            token_0.clone(),
            token_1.clone(),
            fee,
            tick_spacing,
            initial_sqrt_price,
        ),
    );
    let client = PoolContractClient::new(&env, &pool_id);

    // Metadata reads reflect constructor inputs.
    assert_eq!(client.fee(), fee);
    assert_eq!(client.tick_spacing(), tick_spacing);
    assert_eq!(client.token_0(), token_0);
    assert_eq!(client.token_1(), token_1);

    // slot0 is initialized at the supplied price / derived tick and unlocked.
    let slot0 = client.slot0();
    assert_eq!(slot0.sqrt_price_x64, initial_sqrt_price);
    assert_eq!(slot0.tick, 0);
    assert!(slot0.unlocked);

    // Fresh pool has no liquidity.
    assert_eq!(client.liquidity(), 0);
}
