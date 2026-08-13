#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct UserProfileContract;

#[contractimpl]
impl UserProfileContract {
    /// Retrieve the profile string for a given user address.
    /// Returns an empty string if no profile is set.
    pub fn get_profile(env: Env, user: Address) -> String {
        env.storage()
            .persistent()
            .get(&user)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    /// Set the profile string for the caller's user address.
    /// Requires authentication of the user address.
    pub fn set_profile(env: Env, user: Address, profile: String) {
        user.require_auth();
        env.storage().persistent().set(&user, &profile);
    }
}
