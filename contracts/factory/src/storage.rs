#![allow(unused)]
use soroban_sdk::{contracttype, Address, BytesN, Env};

use crate::PoolKey;

#[contracttype]
enum DataKey {
    Initialized,
    Admin,
    PoolWasmHash,
    FeeRecipient,
    ProtocolFee,
    Pool(PoolKey),
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

pub fn write_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_pool_wasm_hash(env: &Env, hash: &BytesN<32>) {
    env.storage().instance().set(&DataKey::PoolWasmHash, hash);
}

pub fn read_pool_wasm_hash(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&DataKey::PoolWasmHash)
        .unwrap()
}

pub fn write_fee_recipient(env: &Env, recipient: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::FeeRecipient, recipient);
}

pub fn read_fee_recipient(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::FeeRecipient)
        .unwrap()
}

pub fn write_protocol_fee(env: &Env, fee: u32) {
    env.storage().instance().set(&DataKey::ProtocolFee, &fee);
}

pub fn read_protocol_fee(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::ProtocolFee)
        .unwrap_or(0)
}

pub fn write_pool(env: &Env, key: &PoolKey, address: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::Pool(key.clone()), address);
}

pub fn get_pool(env: &Env, key: &PoolKey) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Pool(key.clone()))
}
