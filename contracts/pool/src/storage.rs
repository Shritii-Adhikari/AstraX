use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Slot0 {
    pub sqrt_price_x64: u128,
    pub tick: i32,
    pub fee_protocol: u32,
    pub unlocked: bool,
}

#[contracttype]
enum DataKey {
    Slot0,
    Liquidity,
    FeeGrowthGlobal0,
    FeeGrowthGlobal1,
    Token0,
    Token1,
    Fee,
    TickSpacing,
    Factory,
    ProtocolFeesOwed0,
    ProtocolFeesOwed1,
}

pub fn read_slot0(env: &Env) -> Slot0 {
    env.storage().instance().get(&DataKey::Slot0).unwrap()
}

pub fn write_slot0(env: &Env, slot0: &Slot0) {
    env.storage().instance().set(&DataKey::Slot0, slot0);
}

pub fn read_liquidity(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::Liquidity)
        .unwrap_or(0)
}

pub fn write_liquidity(env: &Env, liquidity: u128) {
    env.storage()
        .instance()
        .set(&DataKey::Liquidity, &liquidity);
}

pub fn read_fee_growth_global_0(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::FeeGrowthGlobal0)
        .unwrap_or(0)
}

pub fn write_fee_growth_global_0(env: &Env, val: u128) {
    env.storage()
        .instance()
        .set(&DataKey::FeeGrowthGlobal0, &val);
}

pub fn read_fee_growth_global_1(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::FeeGrowthGlobal1)
        .unwrap_or(0)
}

pub fn write_fee_growth_global_1(env: &Env, val: u128) {
    env.storage()
        .instance()
        .set(&DataKey::FeeGrowthGlobal1, &val);
}

pub fn read_token_0(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token0).unwrap()
}

pub fn read_token_1(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token1).unwrap()
}

pub fn read_fee(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::Fee).unwrap()
}

pub fn read_tick_spacing(env: &Env) -> i32 {
    env.storage().instance().get(&DataKey::TickSpacing).unwrap()
}

pub fn read_factory(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Factory).unwrap()
}

pub fn initialize_storage(
    env: &Env,
    factory: &Address,
    token_0: &Address,
    token_1: &Address,
    fee: u32,
    tick_spacing: i32,
    sqrt_price_x64: u128,
    initial_tick: i32,
) {
    env.storage().instance().set(&DataKey::Factory, factory);
    env.storage().instance().set(&DataKey::Token0, token_0);
    env.storage().instance().set(&DataKey::Token1, token_1);
    env.storage().instance().set(&DataKey::Fee, &fee);
    env.storage()
        .instance()
        .set(&DataKey::TickSpacing, &tick_spacing);
    env.storage().instance().set(
        &DataKey::Slot0,
        &Slot0 {
            sqrt_price_x64,
            tick: initial_tick,
            fee_protocol: 0u32,
            unlocked: true,
        },
    );
    env.storage().instance().set(&DataKey::Liquidity, &0u128);
    env.storage()
        .instance()
        .set(&DataKey::FeeGrowthGlobal0, &0u128);
    env.storage()
        .instance()
        .set(&DataKey::FeeGrowthGlobal1, &0u128);
    env.storage()
        .instance()
        .set(&DataKey::ProtocolFeesOwed0, &0u128);
    env.storage()
        .instance()
        .set(&DataKey::ProtocolFeesOwed1, &0u128);
}

pub fn read_protocol_fees_owed_0(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::ProtocolFeesOwed0)
        .unwrap_or(0)
}

pub fn write_protocol_fees_owed_0(env: &Env, val: u128) {
    env.storage()
        .instance()
        .set(&DataKey::ProtocolFeesOwed0, &val);
}

pub fn read_protocol_fees_owed_1(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::ProtocolFeesOwed1)
        .unwrap_or(0)
}

pub fn write_protocol_fees_owed_1(env: &Env, val: u128) {
    env.storage()
        .instance()
        .set(&DataKey::ProtocolFeesOwed1, &val);
}
