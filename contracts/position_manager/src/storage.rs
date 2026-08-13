use crate::PositionMetadata;
use soroban_sdk::{contracttype, vec, Address, Env, Vec};

#[contracttype]
enum DataKey {
    Initialized,
    Factory,
    NextId,
    PositionMeta(u128),
    OwnerPositions(Address),
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

pub fn write_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

pub fn write_factory(env: &Env, factory: &Address) {
    env.storage().instance().set(&DataKey::Factory, factory);
}

pub fn read_factory(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Factory).unwrap()
}

pub fn write_next_id(env: &Env, id: u128) {
    env.storage().instance().set(&DataKey::NextId, &id);
}

pub fn read_next_id(env: &Env) -> u128 {
    env.storage().instance().get(&DataKey::NextId).unwrap_or(1)
}

pub fn write_position_metadata(env: &Env, id: u128, meta: &PositionMetadata) {
    env.storage()
        .persistent()
        .set(&DataKey::PositionMeta(id), meta);
    env.storage()
        .persistent()
        .extend_ttl(&DataKey::PositionMeta(id), 200_000, 200_000);
}

pub fn read_position_metadata(env: &Env, id: u128) -> PositionMetadata {
    env.storage()
        .persistent()
        .get(&DataKey::PositionMeta(id))
        .expect("position not found")
}

pub fn remove_position_metadata(env: &Env, id: u128) {
    env.storage()
        .persistent()
        .remove(&DataKey::PositionMeta(id));
}

pub fn add_position_to_owner(env: &Env, owner: &Address, id: u128) {
    let mut positions = get_owner_positions(env, owner);
    positions.push_back(id);
    env.storage()
        .persistent()
        .set(&DataKey::OwnerPositions(owner.clone()), &positions);
    env.storage().persistent().extend_ttl(
        &DataKey::OwnerPositions(owner.clone()),
        200_000,
        200_000,
    );
}

pub fn remove_position_from_owner(env: &Env, owner: &Address, id: u128) {
    let positions = get_owner_positions(env, owner);
    let mut updated: Vec<u128> = vec![env];
    for i in 0..positions.len() {
        let pos_id = positions.get(i).unwrap();
        if pos_id != id {
            updated.push_back(pos_id);
        }
    }
    env.storage()
        .persistent()
        .set(&DataKey::OwnerPositions(owner.clone()), &updated);
}

pub fn get_owner_positions(env: &Env, owner: &Address) -> Vec<u128> {
    env.storage()
        .persistent()
        .get(&DataKey::OwnerPositions(owner.clone()))
        .unwrap_or_else(|| vec![env])
}
