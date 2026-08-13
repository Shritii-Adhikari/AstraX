use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
enum DataKey {
    Initialized,
    Factory,
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
