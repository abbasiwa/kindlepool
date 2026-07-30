#![no_std]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

mod pool;
mod types;

#[cfg(test)]
mod test;

#[contract]
pub struct SponsorPool;

#[contractimpl]
impl SponsorPool {
    pub fn create(
        env: Env,
        creator: Address,
        goal: i128,
        deadline: u64,
        token: Address,
        metadata_hash: BytesN<32>,
    ) -> u32 {
        pool::create(&env, &creator, goal, deadline, &token, &metadata_hash)
    }

    pub fn deposit(env: Env, pool_id: u32, supporter: Address, amount: i128) {
        pool::deposit(&env, pool_id, &supporter, amount);
    }

    pub fn submit_work(env: Env, pool_id: u32, work_hash: BytesN<32>) {
        pool::submit_work(&env, pool_id, &work_hash);
    }

    pub fn vote(env: Env, pool_id: u32, voter: Address, approve: bool) {
        pool::vote(&env, pool_id, &voter, approve);
    }

    pub fn finalize(env: Env, pool_id: u32) {
        pool::finalize(&env, pool_id);
    }

    pub fn get_pool(env: Env, pool_id: u32) -> Option<types::Pool> {
        pool::get_pool(&env, pool_id)
    }
}
