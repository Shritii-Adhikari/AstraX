/// Q64.64 fixed-point constant: 2^64
pub const Q64: u128 = 1u128 << 64;

/// Tick bounds — at these extremes sqrt_price stays within u128 for Q64.64
pub const MIN_TICK: i32 = -443636;
pub const MAX_TICK: i32 = 443636;

/// MIN_SQRT_RATIO: sqrt(1.0001^-443636) * 2^64 ≈ 72057594037927936 (= 2^56)
pub const MIN_SQRT_RATIO: u128 = 72057594037927936u128;
/// MAX_SQRT_RATIO: sqrt(1.0001^443636) * 2^64 ≈ 4722366482869645213696 (≈ 2^72)
pub const MAX_SQRT_RATIO: u128 = 4722366482869645213696u128;

/// Convert tick index to sqrt(price) in Q64.64 fixed-point.
/// Uses bit-decomposition: sqrt(1.0001^abs_tick) via precomputed factors.
/// Each factor[i] = floor(2^64 / sqrt(1.0001^(2^i)) * 2^64) as a Q64.64 multiplier.
pub fn tick_to_sqrt_price_x64(tick: i32) -> u128 {
    assert!(tick >= MIN_TICK && tick <= MAX_TICK, "tick out of bounds");
    let abs_tick = tick.unsigned_abs();

    // Precomputed constants: for bit i, the constant is
    //   floor(2^128 / sqrt(1.0001)^(2^i))
    // These are Q64.128 values used as multipliers then shifted back.
    // Below constants are floor(2^128 / 1.0001^(2^i / 2)) stored as Q0.128 fractions.
    // We represent them as u128 high parts (× 2^64 = u128 range values).
    // Constants: ratio[i] = floor(sqrt(1.0001^(2^i)) * 2^64) (inverse for negative tick)
    // For positive approach: start with 2^64 and multiply/divide by factors.

    // Simplified approach: compute ratio directly using iterated squaring.
    // ratio = 2^64 * (1 / sqrt(1.0001))^abs_tick  [for denominator form]
    // We accumulate this in Q64.64 form.

    // Precomputed: FACTORS[i] = floor(2^64 / sqrt(1.0001^(2^i)))
    // Derived from Uniswap V3 Q128 constants by >> 64.
    // If abs_tick has bit i set, multiply ratio by FACTORS[i] and shift right 64.
    const FACTORS: [u128; 20] = [
        18445821805675392311, // bit 0:  / sqrt(1.0001^1)
        18444899583751176498, // bit 1:  / sqrt(1.0001^2)
        18443055278223354162, // bit 2:  / sqrt(1.0001^4)
        18439367220385604838, // bit 3:  / sqrt(1.0001^8)
        18431993317065449817, // bit 4:  / sqrt(1.0001^16)
        18417254355718160513, // bit 5:  / sqrt(1.0001^32)
        18387811781193591352, // bit 6:  / sqrt(1.0001^64)
        18329067761203520168, // bit 7:  / sqrt(1.0001^128)
        18212142134806087854, // bit 8:  / sqrt(1.0001^256)
        17980523815641551639, // bit 9:  / sqrt(1.0001^512)
        17526086738831147013, // bit 10: / sqrt(1.0001^1024)
        16651378430235024244, // bit 11: / sqrt(1.0001^2048)
        15030750278693429944, // bit 12: / sqrt(1.0001^4096)
        12247334978882834399, // bit 13: / sqrt(1.0001^8192)
        8131365268884726200,  // bit 14: / sqrt(1.0001^16384)
        3584323654723342297,  // bit 15: / sqrt(1.0001^32768)
        696457651847846528,   // bit 16: / sqrt(1.0001^65536)
        26294789957452057,    // bit 17: / sqrt(1.0001^131072)
        37481735321082,       // bit 18: / sqrt(1.0001^262144)
        0,                    // bit 19: not used (2^19 > MAX_TICK)
    ];

    let mut ratio: u128 = Q64; // = 2^64, represents 1.0 in Q64.64

    for i in 0..19u32 {
        if abs_tick & (1u32 << i) != 0 && FACTORS[i as usize] != 0 {
            // ratio = ratio * FACTORS[i] / 2^64
            ratio = mul_shift64(ratio, FACTORS[i as usize]);
        }
    }

    if tick > 0 {
        // For positive tick: invert the ratio.
        // We want floor(2^128 / ratio). Using u128::MAX = 2^128 - 1:
        // floor(2^128 / ratio) = (u128::MAX / ratio) + [1 if u128::MAX % ratio == ratio - 1]
        ratio = u128::MAX / ratio + if u128::MAX % ratio == ratio - 1 { 1 } else { 0 };
    }

    // Clamp to valid range
    ratio.max(MIN_SQRT_RATIO).min(MAX_SQRT_RATIO - 1)
}

/// Convert sqrt price in Q64.64 to tick index.
pub fn sqrt_price_to_tick(sqrt_price_x64: u128) -> i32 {
    assert!(sqrt_price_x64 >= MIN_SQRT_RATIO, "sqrt price too low");
    assert!(sqrt_price_x64 < MAX_SQRT_RATIO, "sqrt price too high");

    // Binary search over tick range
    let mut lo: i32 = MIN_TICK;
    let mut hi: i32 = MAX_TICK;

    while lo < hi {
        let mid = lo + (hi - lo + 1) / 2;
        let mid_price = tick_to_sqrt_price_x64(mid);
        if mid_price <= sqrt_price_x64 {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }

    lo
}

/// Multiply two Q64.64 values and shift right by 64: floor((a * b) / 2^64).
/// b is always a FACTOR constant (< 2^64).  a starts at Q64 (= 2^64) and
/// decreases from there, so a_hi is at most 1.
/// When a = Q64 exactly: a_hi = 1, a_lo = 0  →  result = b              (correct: 1.0 × factor = factor)
/// When a < Q64:         a_hi = 0, a_lo = a   →  result = (a * b) >> 64 (both fit in u64, product < 2^128)
fn mul_shift64(a: u128, b: u128) -> u128 {
    let a_hi = a >> 64;
    let a_lo = a & 0xFFFF_FFFF_FFFF_FFFFu128;
    // a_hi * b: a_hi ≤ 1, b < 2^64  →  no overflow
    // a_lo * b: both < 2^64          →  product < 2^128, fits in u128
    a_hi * b + ((a_lo * b) >> 64)
}
