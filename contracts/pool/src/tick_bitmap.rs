use soroban_sdk::{contracttype, Env};

#[contracttype]
enum BitmapKey {
    Word(i32),
}

fn get_word(env: &Env, word_pos: i32) -> u128 {
    env.storage()
        .persistent()
        .get(&BitmapKey::Word(word_pos))
        .unwrap_or(0u128)
}

fn set_word(env: &Env, word_pos: i32, word: u128) {
    env.storage()
        .persistent()
        .set(&BitmapKey::Word(word_pos), &word);
    env.storage()
        .persistent()
        .extend_ttl(&BitmapKey::Word(word_pos), 200_000, 200_000);
}

/// (word_pos, bit_pos) from a tick that is already a multiple of tick_spacing
fn position(compressed: i32) -> (i32, u8) {
    // word_pos = compressed >> 7, bit_pos = compressed & 127
    let word_pos = if compressed >= 0 {
        compressed >> 7
    } else {
        // Arithmetic right shift for negative — ensure bit stays 0-127
        (compressed - 127) / 128
    };
    let bit_pos = ((compressed % 128 + 128) % 128) as u8;
    (word_pos, bit_pos)
}

pub fn flip_tick(env: &Env, tick: i32, tick_spacing: i32) {
    assert!(tick % tick_spacing == 0, "invalid tick");
    let compressed = tick / tick_spacing;
    let (word_pos, bit_pos) = position(compressed);
    let mask = 1u128 << bit_pos;
    let word = get_word(env, word_pos);
    set_word(env, word_pos, word ^ mask);
}

/// Returns the next initialized tick and whether it's initialized.
pub fn next_initialized_tick_within_one_word(
    env: &Env,
    tick: i32,
    tick_spacing: i32,
    lte: bool,
) -> (i32, bool) {
    let compressed = if tick < 0 && tick % tick_spacing != 0 {
        tick / tick_spacing - 1
    } else {
        tick / tick_spacing
    };

    if lte {
        let (word_pos, bit_pos) = position(compressed);
        // Mask all bits at and below bit_pos
        let mask: u128 = if bit_pos == 127 {
            u128::MAX
        } else {
            (1u128 << (bit_pos + 1)) - 1
        };
        let masked = get_word(env, word_pos) & mask;
        let initialized = masked != 0;
        let next = if initialized {
            let msb = 127u8 - masked.leading_zeros() as u8;
            (compressed - (bit_pos as i32 - msb as i32)) * tick_spacing
        } else {
            (compressed - bit_pos as i32) * tick_spacing
        };
        (next, initialized)
    } else {
        let next_compressed = compressed + 1;
        let (word_pos, bit_pos) = position(next_compressed);
        // Mask all bits at and above bit_pos
        let mask: u128 = if bit_pos == 0 {
            u128::MAX
        } else {
            u128::MAX.wrapping_shl(bit_pos as u32)
        };
        let masked = get_word(env, word_pos) & mask;
        let initialized = masked != 0;
        let next = if initialized {
            let lsb = masked.trailing_zeros() as i32;
            (next_compressed + lsb - bit_pos as i32) * tick_spacing
        } else {
            (next_compressed + 127 - bit_pos as i32) * tick_spacing
        };
        (next, initialized)
    }
}
