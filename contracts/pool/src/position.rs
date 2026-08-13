use crate::math::fixed_point::{mul_div, Q64};
use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug)]
pub struct PositionKey {
    pub owner: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
}

#[contracttype]
#[derive(Clone, Debug, Default)]
pub struct PositionInfo {
    pub liquidity: u128,
    pub fee_growth_inside_0_last: u128,
    pub fee_growth_inside_1_last: u128,
    pub tokens_owed_0: u128,
    pub tokens_owed_1: u128,
}

#[contracttype]
enum PosKey {
    Position(PositionKey),
}

pub fn get_position(env: &Env, owner: &Address, tick_lower: i32, tick_upper: i32) -> PositionInfo {
    let key = PosKey::Position(PositionKey {
        owner: owner.clone(),
        tick_lower,
        tick_upper,
    });
    env.storage().persistent().get(&key).unwrap_or_default()
}

pub fn write_position(
    env: &Env,
    owner: &Address,
    tick_lower: i32,
    tick_upper: i32,
    info: &PositionInfo,
) {
    let key = PosKey::Position(PositionKey {
        owner: owner.clone(),
        tick_lower,
        tick_upper,
    });
    env.storage().persistent().set(&key, info);
    env.storage()
        .persistent()
        .extend_ttl(&key, 200_000, 200_000);
}

/// Update a position's liquidity and settle owed fees.
pub fn update_position(
    env: &Env,
    owner: &Address,
    tick_lower: i32,
    tick_upper: i32,
    liquidity_delta: i128,
    fee_growth_inside_0: u128,
    fee_growth_inside_1: u128,
) -> PositionInfo {
    let mut pos = get_position(env, owner, tick_lower, tick_upper);

    // Accrue fees since last update: tokens_owed = liquidity × (fg_inside − fg_last) / Q64
    let delta_0 = fee_growth_inside_0.wrapping_sub(pos.fee_growth_inside_0_last);
    let delta_1 = fee_growth_inside_1.wrapping_sub(pos.fee_growth_inside_1_last);
    let tokens_owed_0 = mul_div(pos.liquidity, delta_0, Q64);
    let tokens_owed_1 = mul_div(pos.liquidity, delta_1, Q64);

    pos.tokens_owed_0 = pos
        .tokens_owed_0
        .checked_add(tokens_owed_0)
        .unwrap_or(u128::MAX);
    pos.tokens_owed_1 = pos
        .tokens_owed_1
        .checked_add(tokens_owed_1)
        .unwrap_or(u128::MAX);

    if liquidity_delta != 0 {
        pos.liquidity = if liquidity_delta >= 0 {
            pos.liquidity
                .checked_add(liquidity_delta as u128)
                .expect("liquidity overflow")
        } else {
            pos.liquidity
                .checked_sub((-liquidity_delta) as u128)
                .expect("liquidity underflow")
        };
    }

    pos.fee_growth_inside_0_last = fee_growth_inside_0;
    pos.fee_growth_inside_1_last = fee_growth_inside_1;

    write_position(env, owner, tick_lower, tick_upper, &pos);
    pos
}
