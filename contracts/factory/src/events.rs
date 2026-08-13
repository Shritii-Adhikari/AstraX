use soroban_sdk::{symbol_short, Address, Env, Symbol};

pub fn emit_pool_created(
    env: &Env,
    token_0: &Address,
    token_1: &Address,
    fee: u32,
    tick_spacing: i32,
    pool: &Address,
) {
    let topics = (symbol_short!("pool_crtd"), token_0, token_1, fee);
    env.events().publish(topics, (tick_spacing, pool));
}
