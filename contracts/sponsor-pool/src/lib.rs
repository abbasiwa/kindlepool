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

    pub fn raise_dispute(
        env: Env,
        pool_id: u32,
        disputant: Address,
        reason: u32,
        evidence_hash: BytesN<32>,
    ) {
        pool::raise_dispute(&env, pool_id, &disputant, reason, &evidence_hash);
    }

    pub fn resolve_dispute(
        env: Env,
        pool_id: u32,
        caller: Address,
        dispute_id: u32,
        vote_for_creator: bool,
        reason_hash: BytesN<32>,
    ) {
        pool::resolve_dispute(&env, pool_id, &caller, dispute_id, vote_for_creator, &reason_hash);
    }

    pub fn close_dispute(env: Env, pool_id: u32, dispute_id: u32) {
        pool::close_dispute(&env, pool_id, dispute_id);
    }

    pub fn appeal_dispute(env: Env, pool_id: u32, disputant: Address, dispute_id: u32) {
        pool::appeal_dispute(&env, pool_id, &disputant, dispute_id);
    }

    pub fn set_fee(env: Env, admin: Address, fee_bps: u32, treasury: Address) {
        pool::set_fee(&env, &admin, fee_bps, &treasury);
    }

    pub fn get_fee(env: Env) -> (i128, Option<Address>) {
        pool::get_fee(&env)
    }

    pub fn get_total_fees_collected(env: Env) -> i128 {
        pool::get_total_fees_collected(&env)
    }

    pub fn get_dispute(env: Env, dispute_id: u32) -> Option<types::Dispute> {
        pool::get_dispute(&env, dispute_id)
    }

    pub fn get_arbitrator_votes(
        env: Env,
        dispute_id: u32,
    ) -> soroban_sdk::Vec<types::ArbitratorVote> {
        pool::get_arbitrator_votes(&env, dispute_id)
    }

    pub fn get_pool(env: Env, pool_id: u32) -> Option<types::Pool> {
        pool::get_pool(&env, pool_id)
    }
}
