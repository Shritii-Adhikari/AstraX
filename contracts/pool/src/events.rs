use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_swap(
    env: &Env,
    sender: &Address,
    recipient: &Address,
    amount_0: i128,
    amount_1: i128,
    sqrt_price_x64: u128,
    liquidity: u128,
    tick: i32,
) {
    env.events().publish(
        (symbol_short!("swap"), sender, recipient),
        (amount_0, amount_1, sqrt_price_x64, liquidity, tick),
    );
}

pub fn emit_mint(
    env: &Env,
    owner: &Address,
    tick_lower: i32,
    tick_upper: i32,
    amount: u128,
    amount_0: u128,
    amount_1: u128,
) {
    env.events().publish(
        (symbol_short!("mint"), owner),
        (tick_lower, tick_upper, amount, amount_0, amount_1),
    );
}

pub fn emit_burn(
    env: &Env,
    owner: &Address,
    tick_lower: i32,
    tick_upper: i32,
    amount: u128,
    amount_0: u128,
    amount_1: u128,
) {
    env.events().publish(
        (symbol_short!("burn"), owner),
        (tick_lower, tick_upper, amount, amount_0, amount_1),
    );
}

pub fn emit_collect(
    env: &Env,
    owner: &Address,
    recipient: &Address,
    tick_lower: i32,
    tick_upper: i32,
    amount_0: u128,
    amount_1: u128,
) {
    env.events().publish(
        (symbol_short!("collect"), owner, recipient),
        (tick_lower, tick_upper, amount_0, amount_1),
    );
}
