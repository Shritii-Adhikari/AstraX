/// Q64.64 fixed-point constant: 2^64
pub const Q64: u128 = 1u128 << 64;

/// Multiply a * b / denominator using 256-bit intermediate arithmetic.
pub fn mul_div(a: u128, b: u128, denominator: u128) -> u128 {
    assert!(denominator != 0, "div/0");
    if a == 0 || b == 0 {
        return 0;
    }
    let (hi, lo) = wide_mul(a, b);
    div_u256_u128(hi, lo, denominator)
}

/// Same as mul_div but rounds up.
pub fn mul_div_ceil(a: u128, b: u128, denominator: u128) -> u128 {
    assert!(denominator != 0, "div/0");
    if a == 0 || b == 0 {
        return 0;
    }
    let (hi, lo) = wide_mul(a, b);
    let quotient = div_u256_u128(hi, lo, denominator);
    let (r_hi, r_lo) = wide_mul(quotient, denominator);
    if r_hi < hi || (r_hi == hi && r_lo < lo) {
        quotient + 1
    } else {
        quotient
    }
}

/// 128×128 → 256 multiplication. Returns (high_128, low_128).
pub fn wide_mul(a: u128, b: u128) -> (u128, u128) {
    let a_lo = a & 0xFFFF_FFFF_FFFF_FFFFu128;
    let a_hi = a >> 64;
    let b_lo = b & 0xFFFF_FFFF_FFFF_FFFFu128;
    let b_hi = b >> 64;

    let ll = a_lo * b_lo;
    let lh = a_lo * b_hi;
    let hl = a_hi * b_lo;
    let hh = a_hi * b_hi;

    let mid = lh.wrapping_add(hl);
    let mid_carry: u128 = if mid < lh { 1u128 << 64 } else { 0 };

    let lo = ll.wrapping_add(mid << 64);
    let lo_carry: u128 = if lo < ll { 1 } else { 0 };

    let hi = hh + (mid >> 64) + mid_carry + lo_carry;
    (hi, lo)
}

/// Divide 256-bit (hi, lo) by 128-bit d. Panics if quotient overflows u128.
/// Handles all denominators including d > 2^64 (needed for sqrt_price values up to MAX_SQRT_RATIO ≈ 2^72).
fn div_u256_u128(hi: u128, lo: u128, d: u128) -> u128 {
    if hi == 0 {
        return lo / d;
    }
    assert!(d > hi, "quotient overflow");

    // Fast path: d fits in 64 bits (original 3-limb algorithm, always correct here)
    if d <= u64::MAX as u128 {
        let a0 = lo & 0xFFFF_FFFF_FFFF_FFFFu128;
        let a1 = lo >> 64;
        // hi < d <= 2^64-1 so hi < 2^64 and (hi << 64) doesn't overflow u128
        let partial2 = (hi << 64) | a1;
        let q_hi = partial2 / d;
        let r2 = partial2 % d;
        let partial3 = (r2 << 64) | a0;
        let q_lo = partial3 / d;
        return (q_hi << 64) | q_lo;
    }

    // Slow path: d > 2^64.
    // The assert above (d > hi) guarantees q = floor(N/d) < 2^128, but q can
    // still exceed 2^64 — e.g. amount_0 divides a ~2^158 numerator by a
    // sqrt_price ~2^65, yielding ~2^93. So the binary search must cover the
    // full u128 range, not [0, 2^64). Capping at u64::MAX silently clamped the
    // quotient and floored amount_0 to 0 for every XLM/USDC pool (price > 1).
    let mut lo_q = 0u128;
    let mut hi_q = u128::MAX;
    while lo_q < hi_q {
        // Overflow-safe ceil midpoint: lo_q + ceil((hi_q - lo_q) / 2).
        // Plain (hi_q - lo_q + 1) would overflow when the span is u128::MAX.
        let span = hi_q - lo_q;
        let mid = lo_q + (span >> 1) + (span & 1);
        let (p_hi, p_lo) = wide_mul(mid, d);
        if p_hi < hi || (p_hi == hi && p_lo <= lo) {
            lo_q = mid;
        } else {
            hi_q = mid - 1;
        }
    }
    lo_q
}

/// Integer square root using Newton's method.
pub fn sqrt_u128(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}
