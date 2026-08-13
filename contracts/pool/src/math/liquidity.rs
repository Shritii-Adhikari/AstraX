use super::fixed_point::{mul_div, mul_div_ceil, Q64};

pub fn get_amounts_for_liquidity(
    sqrt_price_x64: u128,
    sqrt_lower_x64: u128,
    sqrt_upper_x64: u128,
    liquidity: u128,
) -> (u128, u128) {
    if sqrt_price_x64 <= sqrt_lower_x64 {
        (amount_0(sqrt_lower_x64, sqrt_upper_x64, liquidity), 0)
    } else if sqrt_price_x64 < sqrt_upper_x64 {
        let a0 = amount_0(sqrt_price_x64, sqrt_upper_x64, liquidity);
        let a1 = amount_1(sqrt_lower_x64, sqrt_price_x64, liquidity);
        (a0, a1)
    } else {
        (0, amount_1(sqrt_lower_x64, sqrt_upper_x64, liquidity))
    }
}

pub fn get_liquidity_for_amounts(
    sqrt_price_x64: u128,
    sqrt_lower_x64: u128,
    sqrt_upper_x64: u128,
    amount_0: u128,
    amount_1: u128,
) -> u128 {
    if sqrt_price_x64 <= sqrt_lower_x64 {
        liq_from_a0(sqrt_lower_x64, sqrt_upper_x64, amount_0)
    } else if sqrt_price_x64 < sqrt_upper_x64 {
        let l0 = liq_from_a0(sqrt_price_x64, sqrt_upper_x64, amount_0);
        let l1 = liq_from_a1(sqrt_lower_x64, sqrt_price_x64, amount_1);
        l0.min(l1)
    } else {
        liq_from_a1(sqrt_lower_x64, sqrt_upper_x64, amount_1)
    }
}

// amount0 = L * (sqrt_hi - sqrt_lo) / (sqrt_lo * sqrt_hi) in Q0 units
fn amount_0(sqrt_lo: u128, sqrt_hi: u128, liquidity: u128) -> u128 {
    if sqrt_lo >= sqrt_hi {
        return 0;
    }
    let num1 = liquidity
        .checked_shl(64)
        .expect("liquidity too large for Q64 shift");
    let num2 = sqrt_hi - sqrt_lo;
    mul_div(mul_div(num1, num2, sqrt_hi), 1, sqrt_lo)
}

// amount1 = L * (sqrt_hi - sqrt_lo) / 2^64
fn amount_1(sqrt_lo: u128, sqrt_hi: u128, liquidity: u128) -> u128 {
    if sqrt_lo >= sqrt_hi {
        return 0;
    }
    mul_div(liquidity, sqrt_hi - sqrt_lo, Q64)
}

fn liq_from_a0(sqrt_lo: u128, sqrt_hi: u128, amount_0: u128) -> u128 {
    assert!(sqrt_hi > sqrt_lo);
    // L = amount0 * sqrt_lo * sqrt_hi / (Q64 * (sqrt_hi - sqrt_lo))
    // intermediate = sqrt_lo * sqrt_hi / Q64  (one Q64 division, not two)
    let intermediate = mul_div(sqrt_lo, sqrt_hi, Q64);
    mul_div(amount_0, intermediate, sqrt_hi - sqrt_lo)
}

fn liq_from_a1(sqrt_lo: u128, sqrt_hi: u128, amount_1: u128) -> u128 {
    assert!(sqrt_hi > sqrt_lo);
    mul_div(amount_1, Q64, sqrt_hi - sqrt_lo)
}
