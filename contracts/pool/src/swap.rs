use crate::math::fixed_point::{mul_div, mul_div_ceil, Q64};

pub struct SwapStepResult {
    pub sqrt_price_next_x64: u128,
    pub amount_in: u128,
    pub amount_out: u128,
    pub fee_amount: u128,
}

/// Compute a single swap step. fee_rate in millionths (e.g. 3000 = 0.3%).
pub fn compute_swap_step(
    sqrt_price_current_x64: u128,
    sqrt_price_target_x64: u128,
    liquidity: u128,
    amount_remaining: i128,
    fee_rate: u32,
) -> SwapStepResult {
    if liquidity == 0 {
        return SwapStepResult {
            sqrt_price_next_x64: sqrt_price_target_x64,
            amount_in: 0,
            amount_out: 0,
            fee_amount: 0,
        };
    }

    let zero_for_one = sqrt_price_current_x64 >= sqrt_price_target_x64;
    let exact_in = amount_remaining >= 0;

    if exact_in {
        let amount_after_fee = mul_div(
            amount_remaining as u128,
            (1_000_000u64 - fee_rate as u64) as u128,
            1_000_000,
        );

        let max_amount_in = if zero_for_one {
            amount_0_delta(
                sqrt_price_target_x64,
                sqrt_price_current_x64,
                liquidity,
                true,
            )
        } else {
            amount_1_delta(
                sqrt_price_current_x64,
                sqrt_price_target_x64,
                liquidity,
                true,
            )
        };

        let full_fill = amount_after_fee >= max_amount_in;
        let (sqrt_next, amount_in_used) = if full_fill {
            (sqrt_price_target_x64, max_amount_in)
        } else {
            let next = next_sqrt_from_input(
                sqrt_price_current_x64,
                liquidity,
                amount_after_fee,
                zero_for_one,
            );
            (next, amount_after_fee)
        };

        let amount_out = if zero_for_one {
            amount_1_delta(sqrt_next, sqrt_price_current_x64, liquidity, false)
        } else {
            amount_0_delta(sqrt_price_current_x64, sqrt_next, liquidity, false)
        };

        // Full fill: fee = gross_input - net_input = amount_in_used * fee_rate / (1 - fee_rate)
        // Partial fill: fee = gross_input - net_input = amount_remaining - amount_after_fee
        let fee = if full_fill {
            mul_div_ceil(
                amount_in_used,
                fee_rate as u128,
                (1_000_000u64 - fee_rate as u64) as u128,
            )
        } else {
            (amount_remaining as u128) - amount_in_used
        };

        SwapStepResult {
            sqrt_price_next_x64: sqrt_next,
            amount_in: amount_in_used,
            amount_out,
            fee_amount: fee,
        }
    } else {
        let amount_out_wanted = (-amount_remaining) as u128;

        let max_amount_out = if zero_for_one {
            amount_1_delta(
                sqrt_price_target_x64,
                sqrt_price_current_x64,
                liquidity,
                false,
            )
        } else {
            amount_0_delta(
                sqrt_price_current_x64,
                sqrt_price_target_x64,
                liquidity,
                false,
            )
        };

        let amount_out = amount_out_wanted.min(max_amount_out);
        let sqrt_next = if amount_out == max_amount_out {
            sqrt_price_target_x64
        } else {
            next_sqrt_from_output(sqrt_price_current_x64, liquidity, amount_out, zero_for_one)
        };

        let amount_in = if zero_for_one {
            amount_0_delta(sqrt_next, sqrt_price_current_x64, liquidity, true)
        } else {
            amount_1_delta(sqrt_price_current_x64, sqrt_next, liquidity, true)
        };
        let fee = mul_div_ceil(
            amount_in,
            fee_rate as u128,
            (1_000_000u64 - fee_rate as u64) as u128,
        );

        SwapStepResult {
            sqrt_price_next_x64: sqrt_next,
            amount_in,
            amount_out,
            fee_amount: fee,
        }
    }
}

// amount0 = L * (sqrt_hi - sqrt_lo) / (sqrt_lo * sqrt_hi) — in Q64.64 units
fn amount_0_delta(sqrt_lo: u128, sqrt_hi: u128, liquidity: u128, round_up: bool) -> u128 {
    if sqrt_lo >= sqrt_hi {
        return 0;
    }
    let num1 = liquidity
        .checked_shl(64)
        .expect("liquidity too large for Q64 shift");
    let num2 = sqrt_hi - sqrt_lo;
    if round_up {
        mul_div_ceil(mul_div(num1, num2, sqrt_hi), 1, sqrt_lo)
    } else {
        mul_div(mul_div(num1, num2, sqrt_hi), 1, sqrt_lo)
    }
}

// amount1 = L * (sqrt_hi - sqrt_lo) / 2^64
fn amount_1_delta(sqrt_lo: u128, sqrt_hi: u128, liquidity: u128, round_up: bool) -> u128 {
    if sqrt_lo >= sqrt_hi {
        return 0;
    }
    if round_up {
        mul_div_ceil(liquidity, sqrt_hi - sqrt_lo, Q64)
    } else {
        mul_div(liquidity, sqrt_hi - sqrt_lo, Q64)
    }
}

fn next_sqrt_from_input(
    sqrt_p: u128,
    liquidity: u128,
    amount_in: u128,
    zero_for_one: bool,
) -> u128 {
    if zero_for_one {
        // new_sqrt = L * sqrt_p / (L + amount0 * sqrt_p / 2^64)
        let lq = mul_div(liquidity, sqrt_p, Q64);
        let amt_scaled = mul_div(amount_in, sqrt_p, Q64);
        let denom = liquidity
            .checked_add(amt_scaled)
            .expect("liquidity+amt_scaled overflow");
        mul_div(lq, Q64, denom)
    } else {
        // new_sqrt = sqrt_p + amount1 / L
        sqrt_p.saturating_add(mul_div(amount_in, Q64, liquidity))
    }
}

fn next_sqrt_from_output(
    sqrt_p: u128,
    liquidity: u128,
    amount_out: u128,
    zero_for_one: bool,
) -> u128 {
    if zero_for_one {
        // Selling token0, receiving token1 out: new_sqrt = sqrt_p - amount1 / L
        let delta = mul_div(amount_out, Q64, liquidity);
        assert!(
            delta <= sqrt_p,
            "amount_out too large: underflows sqrt_price"
        );
        sqrt_p - delta
    } else {
        // Buying token0 out: new_sqrt = L * sqrt_p / (L - amount0 * sqrt_p / Q64)
        let lq = mul_div(liquidity, sqrt_p, Q64);
        let amt_scaled = mul_div(amount_out, sqrt_p, Q64);
        assert!(
            amt_scaled < liquidity,
            "amount_out too large: exceeds available liquidity"
        );
        mul_div(lq, Q64, liquidity - amt_scaled)
    }
}
