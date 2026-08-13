#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

mod events;
mod math;
mod position;
mod storage;
mod swap;
mod tick;
mod tick_bitmap;

#[cfg(test)]
mod test;

use events::*;
use math::fixed_point::{mul_div, Q64};
use math::liquidity::get_amounts_for_liquidity;
use math::sqrt_price::{
    sqrt_price_to_tick, tick_to_sqrt_price_x64, MAX_SQRT_RATIO, MIN_SQRT_RATIO,
};
use position::{get_position, update_position};
use storage::*;
use swap::compute_swap_step;
use tick::{cross_tick, get_fee_growth_inside, get_tick, update_tick};
use tick_bitmap::{flip_tick, next_initialized_tick_within_one_word};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Slot0Public {
    pub sqrt_price_x64: u128,
    pub tick: i32,
    pub fee_protocol: u32,
    pub unlocked: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TickInfoPublic {
    pub liquidity_gross: u128,
    pub liquidity_net: i128,
    pub fee_growth_outside_0: u128,
    pub fee_growth_outside_1: u128,
    pub initialized: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PositionInfoPublic {
    pub liquidity: u128,
    pub fee_growth_inside_0_last: u128,
    pub fee_growth_inside_1_last: u128,
    pub tokens_owed_0: u128,
    pub tokens_owed_1: u128,
}

#[contract]
pub struct PoolContract;

#[contractimpl]
impl PoolContract {
    /// Called once by factory at deploy time (constructor args via deploy_v2)
    pub fn __constructor(
        env: Env,
        factory: Address,
        token_0: Address,
        token_1: Address,
        fee: u32,
        tick_spacing: i32,
        initial_sqrt_price_x64: u128,
    ) {
        assert!(initial_sqrt_price_x64 >= MIN_SQRT_RATIO, "price too low");
        assert!(initial_sqrt_price_x64 < MAX_SQRT_RATIO, "price too high");
        let initial_tick = sqrt_price_to_tick(initial_sqrt_price_x64);
        initialize_storage(
            &env,
            &factory,
            &token_0,
            &token_1,
            fee,
            tick_spacing,
            initial_sqrt_price_x64,
            initial_tick,
        );
    }

    // ─────────────────────────── SWAP ───────────────────────────

    pub fn swap(
        env: Env,
        caller: Address,
        zero_for_one: bool,
        amount_specified: i128,
        sqrt_price_limit_x64: u128,
    ) -> (i128, i128) {
        assert!(amount_specified != 0, "zero amount");
        caller.require_auth();

        let mut slot0 = read_slot0(&env);
        assert!(slot0.unlocked, "locked");

        if zero_for_one {
            assert!(sqrt_price_limit_x64 < slot0.sqrt_price_x64, "bad limit lo");
            assert!(sqrt_price_limit_x64 >= MIN_SQRT_RATIO, "limit too low");
        } else {
            assert!(sqrt_price_limit_x64 > slot0.sqrt_price_x64, "bad limit hi");
            assert!(sqrt_price_limit_x64 < MAX_SQRT_RATIO, "limit too high");
        }

        slot0.unlocked = false;
        write_slot0(&env, &slot0);

        let tick_spacing = read_tick_spacing(&env);
        let fee = read_fee(&env);
        let fee_protocol = slot0.fee_protocol;

        let mut liquidity = read_liquidity(&env);
        let mut fee_growth_global_0 = read_fee_growth_global_0(&env);
        let mut fee_growth_global_1 = read_fee_growth_global_1(&env);
        let mut protocol_fee_0 = read_protocol_fees_owed_0(&env);
        let mut protocol_fee_1 = read_protocol_fees_owed_1(&env);

        let exact_in = amount_specified > 0;
        let mut amount_remaining = amount_specified;
        let mut amount_calculated: i128 = 0;
        let mut sqrt_price = slot0.sqrt_price_x64;
        let mut current_tick = slot0.tick;

        while amount_remaining != 0 && sqrt_price != sqrt_price_limit_x64 {
            let (tick_next, initialized) = next_initialized_tick_within_one_word(
                &env,
                current_tick,
                tick_spacing,
                zero_for_one,
            );
            let tick_clamped = tick_next
                .max(math::sqrt_price::MIN_TICK)
                .min(math::sqrt_price::MAX_TICK);
            let sqrt_next = tick_to_sqrt_price_x64(tick_clamped);

            let sqrt_target = if zero_for_one {
                if sqrt_next < sqrt_price_limit_x64 {
                    sqrt_price_limit_x64
                } else {
                    sqrt_next
                }
            } else {
                if sqrt_next > sqrt_price_limit_x64 {
                    sqrt_price_limit_x64
                } else {
                    sqrt_next
                }
            };

            let step = compute_swap_step(sqrt_price, sqrt_target, liquidity, amount_remaining, fee);

            if exact_in {
                amount_remaining =
                    amount_remaining.saturating_sub((step.amount_in + step.fee_amount) as i128);
                amount_calculated = amount_calculated.saturating_sub(step.amount_out as i128);
            } else {
                amount_remaining = amount_remaining.saturating_add(step.amount_out as i128);
                amount_calculated =
                    amount_calculated.saturating_add((step.amount_in + step.fee_amount) as i128);
            }

            let lp_fee = if fee_protocol > 0 {
                let proto = step.fee_amount / fee_protocol as u128;
                if zero_for_one {
                    protocol_fee_0 += proto;
                } else {
                    protocol_fee_1 += proto;
                }
                step.fee_amount - proto
            } else {
                step.fee_amount
            };

            if liquidity > 0 {
                if zero_for_one {
                    fee_growth_global_0 =
                        fee_growth_global_0.wrapping_add(mul_div(lp_fee, Q64, liquidity));
                } else {
                    fee_growth_global_1 =
                        fee_growth_global_1.wrapping_add(mul_div(lp_fee, Q64, liquidity));
                }
            }

            sqrt_price = step.sqrt_price_next_x64;

            if sqrt_price == sqrt_next {
                if initialized {
                    let liq_net =
                        cross_tick(&env, tick_next, fee_growth_global_0, fee_growth_global_1);
                    let liq_i128 = i128::try_from(liquidity).expect("liquidity overflows i128");
                    let new_liq = if zero_for_one {
                        liq_i128
                            .checked_sub(liq_net)
                            .expect("liquidity underflow at tick")
                    } else {
                        liq_i128
                            .checked_add(liq_net)
                            .expect("liquidity overflow at tick")
                    };
                    liquidity =
                        u128::try_from(new_liq).expect("liquidity negative after tick cross");
                }
                current_tick = if zero_for_one {
                    tick_next - 1
                } else {
                    tick_next
                };
            } else if sqrt_price != slot0.sqrt_price_x64 {
                current_tick = sqrt_price_to_tick(sqrt_price);
            }
        }

        // Write all non-lock state while still locked; unlock only after external calls.
        write_liquidity(&env, liquidity);
        write_fee_growth_global_0(&env, fee_growth_global_0);
        write_fee_growth_global_1(&env, fee_growth_global_1);
        write_protocol_fees_owed_0(&env, protocol_fee_0);
        write_protocol_fees_owed_1(&env, protocol_fee_1);

        let (amount_0, amount_1) = if zero_for_one == exact_in {
            (amount_specified - amount_remaining, amount_calculated)
        } else {
            (amount_calculated, amount_specified - amount_remaining)
        };

        let token_0_addr = read_token_0(&env);
        let token_1_addr = read_token_1(&env);

        // Token transfers happen while the reentrancy lock is still held.
        if zero_for_one {
            if amount_1 < 0 {
                token::Client::new(&env, &token_1_addr).transfer(
                    &env.current_contract_address(),
                    &caller,
                    &(-amount_1),
                );
            }
            if amount_0 > 0 {
                token::Client::new(&env, &token_0_addr).transfer_from(
                    &env.current_contract_address(),
                    &caller,
                    &env.current_contract_address(),
                    &amount_0,
                );
            }
        } else {
            if amount_0 < 0 {
                token::Client::new(&env, &token_0_addr).transfer(
                    &env.current_contract_address(),
                    &caller,
                    &(-amount_0),
                );
            }
            if amount_1 > 0 {
                token::Client::new(&env, &token_1_addr).transfer_from(
                    &env.current_contract_address(),
                    &caller,
                    &env.current_contract_address(),
                    &amount_1,
                );
            }
        }

        // Unlock only after all external calls are complete.
        write_slot0(
            &env,
            &Slot0 {
                sqrt_price_x64: sqrt_price,
                tick: current_tick,
                fee_protocol: slot0.fee_protocol,
                unlocked: true,
            },
        );

        emit_swap(
            &env,
            &caller,
            &caller,
            amount_0,
            amount_1,
            sqrt_price,
            liquidity,
            current_tick,
        );
        (amount_0, amount_1)
    }

    // ─────────────────────────── MINT ───────────────────────────

    pub fn mint(
        env: Env,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount: u128,
    ) -> (u128, u128) {
        assert!(amount > 0, "zero liquidity");
        recipient.require_auth();

        let tick_spacing = read_tick_spacing(&env);
        assert!(
            tick_lower >= math::sqrt_price::MIN_TICK,
            "tick_lower below MIN_TICK"
        );
        assert!(
            tick_upper <= math::sqrt_price::MAX_TICK,
            "tick_upper above MAX_TICK"
        );
        assert!(tick_lower % tick_spacing == 0, "bad lower tick");
        assert!(tick_upper % tick_spacing == 0, "bad upper tick");
        assert!(tick_lower < tick_upper, "tick order");

        let mut slot0 = read_slot0(&env);
        assert!(slot0.unlocked, "locked");
        slot0.unlocked = false;
        write_slot0(&env, &slot0);
        let fg0 = read_fee_growth_global_0(&env);
        let fg1 = read_fee_growth_global_1(&env);

        let fl = update_tick(
            &env,
            tick_lower,
            slot0.tick,
            amount as i128,
            fg0,
            fg1,
            false,
        );
        let fu = update_tick(&env, tick_upper, slot0.tick, amount as i128, fg0, fg1, true);
        if fl {
            flip_tick(&env, tick_lower, tick_spacing);
        }
        if fu {
            flip_tick(&env, tick_upper, tick_spacing);
        }

        let (fi0, fi1) = get_fee_growth_inside(&env, tick_lower, tick_upper, slot0.tick, fg0, fg1);
        update_position(
            &env,
            &recipient,
            tick_lower,
            tick_upper,
            amount as i128,
            fi0,
            fi1,
        );

        if slot0.tick >= tick_lower && slot0.tick < tick_upper {
            write_liquidity(
                &env,
                read_liquidity(&env)
                    .checked_add(amount)
                    .expect("liq overflow"),
            );
        }

        let sp_lo = tick_to_sqrt_price_x64(tick_lower);
        let sp_hi = tick_to_sqrt_price_x64(tick_upper);
        let (amount_0, amount_1) =
            get_amounts_for_liquidity(slot0.sqrt_price_x64, sp_lo, sp_hi, amount);

        if amount_0 > 0 {
            token::Client::new(&env, &read_token_0(&env)).transfer_from(
                &env.current_contract_address(),
                &recipient,
                &env.current_contract_address(),
                &(amount_0 as i128),
            );
        }
        if amount_1 > 0 {
            token::Client::new(&env, &read_token_1(&env)).transfer_from(
                &env.current_contract_address(),
                &recipient,
                &env.current_contract_address(),
                &(amount_1 as i128),
            );
        }

        write_slot0(
            &env,
            &Slot0 {
                sqrt_price_x64: slot0.sqrt_price_x64,
                tick: slot0.tick,
                fee_protocol: slot0.fee_protocol,
                unlocked: true,
            },
        );
        emit_mint(
            &env, &recipient, tick_lower, tick_upper, amount, amount_0, amount_1,
        );
        (amount_0, amount_1)
    }

    // ─────────────────────────── BURN ───────────────────────────

    pub fn burn(
        env: Env,
        caller: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount: u128,
    ) -> (u128, u128) {
        caller.require_auth();

        let mut slot0 = read_slot0(&env);
        assert!(slot0.unlocked, "locked");
        slot0.unlocked = false;
        write_slot0(&env, &slot0);

        let fg0 = read_fee_growth_global_0(&env);
        let fg1 = read_fee_growth_global_1(&env);
        let tick_spacing = read_tick_spacing(&env);

        let (fi0, fi1) = get_fee_growth_inside(&env, tick_lower, tick_upper, slot0.tick, fg0, fg1);
        update_position(
            &env,
            &caller,
            tick_lower,
            tick_upper,
            -(amount as i128),
            fi0,
            fi1,
        );

        let sp_lo = tick_to_sqrt_price_x64(tick_lower);
        let sp_hi = tick_to_sqrt_price_x64(tick_upper);
        let (amount_0, amount_1) =
            get_amounts_for_liquidity(slot0.sqrt_price_x64, sp_lo, sp_hi, amount);

        if amount_0 > 0 || amount_1 > 0 {
            let mut pos = get_position(&env, &caller, tick_lower, tick_upper);
            pos.tokens_owed_0 = pos.tokens_owed_0.saturating_add(amount_0);
            pos.tokens_owed_1 = pos.tokens_owed_1.saturating_add(amount_1);
            position::write_position(&env, &caller, tick_lower, tick_upper, &pos);
        }

        if slot0.tick >= tick_lower && slot0.tick < tick_upper {
            write_liquidity(
                &env,
                read_liquidity(&env)
                    .checked_sub(amount)
                    .expect("liquidity underflow in burn"),
            );
        }

        let fl = update_tick(
            &env,
            tick_lower,
            slot0.tick,
            -(amount as i128),
            fg0,
            fg1,
            false,
        );
        let fu = update_tick(
            &env,
            tick_upper,
            slot0.tick,
            -(amount as i128),
            fg0,
            fg1,
            true,
        );
        if fl {
            flip_tick(&env, tick_lower, tick_spacing);
        }
        if fu {
            flip_tick(&env, tick_upper, tick_spacing);
        }

        write_slot0(
            &env,
            &Slot0 {
                sqrt_price_x64: slot0.sqrt_price_x64,
                tick: slot0.tick,
                fee_protocol: slot0.fee_protocol,
                unlocked: true,
            },
        );
        emit_burn(
            &env, &caller, tick_lower, tick_upper, amount, amount_0, amount_1,
        );
        (amount_0, amount_1)
    }

    // ────────────────────────── COLLECT ─────────────────────────

    pub fn collect(
        env: Env,
        caller: Address,
        recipient: Address,
        tick_lower: i32,
        tick_upper: i32,
        amount_0_requested: u128,
        amount_1_requested: u128,
    ) -> (u128, u128) {
        caller.require_auth();

        let mut slot0 = read_slot0(&env);
        assert!(slot0.unlocked, "locked");
        slot0.unlocked = false;
        write_slot0(&env, &slot0);
        let fg0 = read_fee_growth_global_0(&env);
        let fg1 = read_fee_growth_global_1(&env);
        let (fi0, fi1) = get_fee_growth_inside(&env, tick_lower, tick_upper, slot0.tick, fg0, fg1);
        let mut pos = update_position(&env, &caller, tick_lower, tick_upper, 0, fi0, fi1);

        let amount_0 = amount_0_requested.min(pos.tokens_owed_0);
        let amount_1 = amount_1_requested.min(pos.tokens_owed_1);

        pos.tokens_owed_0 -= amount_0;
        pos.tokens_owed_1 -= amount_1;
        position::write_position(&env, &caller, tick_lower, tick_upper, &pos);

        if amount_0 > 0 {
            token::Client::new(&env, &read_token_0(&env)).transfer(
                &env.current_contract_address(),
                &recipient,
                &(amount_0 as i128),
            );
        }
        if amount_1 > 0 {
            token::Client::new(&env, &read_token_1(&env)).transfer(
                &env.current_contract_address(),
                &recipient,
                &(amount_1 as i128),
            );
        }

        write_slot0(
            &env,
            &Slot0 {
                sqrt_price_x64: slot0.sqrt_price_x64,
                tick: slot0.tick,
                fee_protocol: slot0.fee_protocol,
                unlocked: true,
            },
        );
        emit_collect(
            &env, &caller, &recipient, tick_lower, tick_upper, amount_0, amount_1,
        );
        (amount_0, amount_1)
    }

    // ─────────────────── PROTOCOL FEE ADMIN ────────────────────

    /// Sync pool price to external market price (e.g. from CoinGecko/Binance).
    /// Only the factory that deployed this pool can call this (testnet admin use).
    pub fn set_price(env: Env, new_sqrt_price_x64: u128) {
        read_factory(&env).require_auth();
        assert!(new_sqrt_price_x64 >= MIN_SQRT_RATIO, "price too low");
        assert!(new_sqrt_price_x64 < MAX_SQRT_RATIO, "price too high");
        let new_tick = sqrt_price_to_tick(new_sqrt_price_x64);
        let slot0 = read_slot0(&env);
        assert!(slot0.unlocked, "pool locked");
        write_slot0(
            &env,
            &Slot0 {
                sqrt_price_x64: new_sqrt_price_x64,
                tick: new_tick,
                fee_protocol: slot0.fee_protocol,
                unlocked: true,
            },
        );
    }

    /// Set the protocol fee share (0 = disabled, 4–10 = 25%–10% of LP fees).
    /// Only callable by the factory that deployed this pool.
    pub fn set_fee_protocol(env: Env, fee_protocol: u32) {
        read_factory(&env).require_auth();
        assert!(
            fee_protocol == 0 || (fee_protocol >= 4 && fee_protocol <= 10),
            "fee_protocol out of range (0 or 4–10)"
        );
        let mut slot0 = read_slot0(&env);
        slot0.fee_protocol = fee_protocol;
        write_slot0(&env, &slot0);
    }

    /// Withdraw accumulated protocol fees. Only callable by the factory.
    pub fn collect_protocol(
        env: Env,
        recipient: Address,
        amount_0_requested: u128,
        amount_1_requested: u128,
    ) -> (u128, u128) {
        read_factory(&env).require_auth();

        let owed_0 = read_protocol_fees_owed_0(&env);
        let owed_1 = read_protocol_fees_owed_1(&env);

        let amount_0 = amount_0_requested.min(owed_0);
        let amount_1 = amount_1_requested.min(owed_1);

        if amount_0 > 0 {
            write_protocol_fees_owed_0(&env, owed_0 - amount_0);
            token::Client::new(&env, &read_token_0(&env)).transfer(
                &env.current_contract_address(),
                &recipient,
                &(amount_0 as i128),
            );
        }
        if amount_1 > 0 {
            write_protocol_fees_owed_1(&env, owed_1 - amount_1);
            token::Client::new(&env, &read_token_1(&env)).transfer(
                &env.current_contract_address(),
                &recipient,
                &(amount_1 as i128),
            );
        }

        (amount_0, amount_1)
    }

    // ──────────────────────── READ-ONLY ─────────────────────────

    pub fn slot0(env: Env) -> Slot0Public {
        let s = read_slot0(&env);
        Slot0Public {
            sqrt_price_x64: s.sqrt_price_x64,
            tick: s.tick,
            fee_protocol: s.fee_protocol,
            unlocked: s.unlocked,
        }
    }
    pub fn liquidity(env: Env) -> u128 {
        read_liquidity(&env)
    }
    pub fn fee_growth_global_0(env: Env) -> u128 {
        read_fee_growth_global_0(&env)
    }
    pub fn fee_growth_global_1(env: Env) -> u128 {
        read_fee_growth_global_1(&env)
    }
    pub fn get_tick_info(env: Env, tick: i32) -> TickInfoPublic {
        let t = get_tick(&env, tick);
        TickInfoPublic {
            liquidity_gross: t.liquidity_gross,
            liquidity_net: t.liquidity_net,
            fee_growth_outside_0: t.fee_growth_outside_0,
            fee_growth_outside_1: t.fee_growth_outside_1,
            initialized: t.initialized,
        }
    }
    pub fn get_position_info(
        env: Env,
        owner: Address,
        tick_lower: i32,
        tick_upper: i32,
    ) -> PositionInfoPublic {
        let p = get_position(&env, &owner, tick_lower, tick_upper);
        PositionInfoPublic {
            liquidity: p.liquidity,
            fee_growth_inside_0_last: p.fee_growth_inside_0_last,
            fee_growth_inside_1_last: p.fee_growth_inside_1_last,
            tokens_owed_0: p.tokens_owed_0,
            tokens_owed_1: p.tokens_owed_1,
        }
    }
    pub fn token_0(env: Env) -> Address {
        read_token_0(&env)
    }
    pub fn token_1(env: Env) -> Address {
        read_token_1(&env)
    }
    pub fn fee(env: Env) -> u32 {
        read_fee(&env)
    }
    pub fn tick_spacing(env: Env) -> i32 {
        read_tick_spacing(&env)
    }
}
