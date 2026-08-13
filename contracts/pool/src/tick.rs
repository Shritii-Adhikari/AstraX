use soroban_sdk::{contracttype, Env};

#[contracttype]
#[derive(Clone, Debug, Default)]
pub struct TickInfo {
    pub liquidity_gross: u128,
    pub liquidity_net: i128,
    pub fee_growth_outside_0: u128,
    pub fee_growth_outside_1: u128,
    pub initialized: bool,
}

#[contracttype]
enum TickKey {
    Tick(i32),
}

pub fn get_tick(env: &Env, tick: i32) -> TickInfo {
    env.storage()
        .persistent()
        .get(&TickKey::Tick(tick))
        .unwrap_or_default()
}

pub fn write_tick(env: &Env, tick: i32, info: &TickInfo) {
    env.storage().persistent().set(&TickKey::Tick(tick), info);
    env.storage()
        .persistent()
        .extend_ttl(&TickKey::Tick(tick), 200_000, 200_000);
}

/// Update tick info when adding or removing liquidity.
/// Returns whether the tick was flipped (initialized ↔ uninitialized).
pub fn update_tick(
    env: &Env,
    tick: i32,
    current_tick: i32,
    liquidity_delta: i128,
    fee_growth_global_0: u128,
    fee_growth_global_1: u128,
    upper: bool,
) -> bool {
    let mut info = get_tick(env, tick);
    let liquidity_gross_before = info.liquidity_gross;

    let liquidity_gross_after = if liquidity_delta >= 0 {
        liquidity_gross_before
            .checked_add(liquidity_delta as u128)
            .expect("overflow")
    } else {
        liquidity_gross_before
            .checked_sub((-liquidity_delta) as u128)
            .expect("underflow")
    };

    let flipped = (liquidity_gross_after == 0) != (liquidity_gross_before == 0);

    if liquidity_gross_before == 0 {
        // Initialize fee_growth_outside for new tick
        if tick <= current_tick {
            info.fee_growth_outside_0 = fee_growth_global_0;
            info.fee_growth_outside_1 = fee_growth_global_1;
        }
        info.initialized = true;
    }

    info.liquidity_gross = liquidity_gross_after;
    info.liquidity_net = if upper {
        info.liquidity_net
            .checked_sub(liquidity_delta)
            .expect("overflow")
    } else {
        info.liquidity_net
            .checked_add(liquidity_delta)
            .expect("overflow")
    };

    if liquidity_gross_after == 0 {
        info.initialized = false;
        info.fee_growth_outside_0 = 0;
        info.fee_growth_outside_1 = 0;
        info.liquidity_net = 0;
        info.liquidity_gross = 0;
    }

    write_tick(env, tick, &info);
    flipped
}

/// Cross a tick (called during swap when price crosses a tick boundary).
/// Flips fee_growth_outside to the other side.
/// Returns the net liquidity change.
pub fn cross_tick(
    env: &Env,
    tick: i32,
    fee_growth_global_0: u128,
    fee_growth_global_1: u128,
) -> i128 {
    let mut info = get_tick(env, tick);
    info.fee_growth_outside_0 = fee_growth_global_0.wrapping_sub(info.fee_growth_outside_0);
    info.fee_growth_outside_1 = fee_growth_global_1.wrapping_sub(info.fee_growth_outside_1);
    write_tick(env, tick, &info);
    info.liquidity_net
}

/// Compute fee_growth_inside a range [tick_lower, tick_upper].
pub fn get_fee_growth_inside(
    env: &Env,
    tick_lower: i32,
    tick_upper: i32,
    tick_current: i32,
    fee_growth_global_0: u128,
    fee_growth_global_1: u128,
) -> (u128, u128) {
    let lower = get_tick(env, tick_lower);
    let upper = get_tick(env, tick_upper);

    let (below_0, below_1) = if tick_current >= tick_lower {
        (lower.fee_growth_outside_0, lower.fee_growth_outside_1)
    } else {
        (
            fee_growth_global_0.wrapping_sub(lower.fee_growth_outside_0),
            fee_growth_global_1.wrapping_sub(lower.fee_growth_outside_1),
        )
    };

    let (above_0, above_1) = if tick_current < tick_upper {
        (upper.fee_growth_outside_0, upper.fee_growth_outside_1)
    } else {
        (
            fee_growth_global_0.wrapping_sub(upper.fee_growth_outside_0),
            fee_growth_global_1.wrapping_sub(upper.fee_growth_outside_1),
        )
    };

    let inside_0 = fee_growth_global_0
        .wrapping_sub(below_0)
        .wrapping_sub(above_0);
    let inside_1 = fee_growth_global_1
        .wrapping_sub(below_1)
        .wrapping_sub(above_1);

    (inside_0, inside_1)
}
