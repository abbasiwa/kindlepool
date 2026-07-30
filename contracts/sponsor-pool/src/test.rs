#![cfg(test)]

use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

use crate::types::*;
use crate::SponsorPoolClient;

fn create_token(env: &Env, admin: &Address) -> Address {
    let contract_id = env.register_stellar_asset_contract(admin.clone());
    contract_id
}

fn mint_tokens(env: &Env, token_id: &Address, to: &Address, amount: i128) {
    let token_client = token::Client::new(env, token_id);
    token_client.mint(to, &amount);
}

fn setup_pool() -> (Env, Address, Address, Address, u32) {
    let env = Env::default();
    env.mock_all_auths();

    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);
    let admin = Address::generate(&env);

    let token = create_token(&env, &admin);
    mint_tokens(&env, &token, &creator, 1_000_000_000);
    mint_tokens(&env, &token, &supporter, 1_000_000_000);

    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    let goal = 100_000_000i128;
    let deadline = env.ledger().timestamp() + 86400;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);

    let pool_id = client.create(&creator, &goal, &deadline, &token, &metadata_hash);

    (env, contract_id, creator, supporter, pool_id)
}

#[test]
fn test_create_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let creator = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    let goal = 100_000_000i128;
    let deadline = env.ledger().timestamp() + 86400;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);

    let pool_id = client.create(&creator, &goal, &deadline, &token, &metadata_hash);
    assert_eq!(pool_id, 1);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.creator, creator);
    assert_eq!(pool.token, token);
    assert_eq!(pool.goal, goal);
    assert_eq!(pool.deadline, deadline);
    assert_eq!(pool.status, 0);
    assert_eq!(pool.total_deposited, 0);
    assert_eq!(pool.total_supporters, 0);
}

#[test]
#[should_panic(expected = "PoolError::InvalidGoal")]
fn test_create_pool_zero_goal() {
    let env = Env::default();
    env.mock_all_auths();
    let creator = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    let deadline = env.ledger().timestamp() + 86400;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);
    client.create(&creator, &0, &deadline, &token, &metadata_hash);
}

#[test]
#[should_panic(expected = "PoolError::InvalidDeadline")]
fn test_create_pool_past_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    let creator = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    let deadline = env.ledger().timestamp() - 1;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);
    client.create(&creator, &100_000_000, &deadline, &token, &metadata_hash);
}

#[test]
fn test_deposit() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);

    let deposit_amount = 50_000_000i128;
    client.deposit(&pool_id, &supporter, &deposit_amount);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.total_deposited, deposit_amount);
    assert_eq!(pool.total_supporters, 1);

    // Deposit again
    client.deposit(&pool_id, &supporter, &25_000_000);
    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.total_deposited, 75_000_000);
}

#[test]
#[should_panic(expected = "PoolError::PoolNotOpen")]
fn test_deposit_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    mint_tokens(&env, &token, &supporter, 1_000_000_000);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    let goal = 100_000_000i128;
    let deadline = env.ledger().timestamp() + 1;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);
    let pool_id = client.create(&creator, &goal, &deadline, &token, &metadata_hash);
    env.ledger().set_timestamp(env.ledger().timestamp() + 2);
    client.deposit(&pool_id, &supporter, &50_000_000);
}

#[test]
fn test_full_lifecycle_approved() {
    let (env, _contract_id, creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);
    let token = client.get_pool(&pool_id).unwrap().token;

    // Deposit enough to meet goal
    client.deposit(&pool_id, &supporter, &100_000_000);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.total_deposited, 100_000_000);

    // Creator submits work
    let work_hash = BytesN::from_array(&env, &[0x02u8; 32]);
    client.submit_work(&pool_id, &work_hash);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.status, 1); // AWAITING_VOTE
    assert!(pool.work_hash.is_some());
    assert!(pool.vote_deadline > env.ledger().timestamp());

    // Supporter votes approve
    client.vote(&pool_id, &supporter, &true);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.yes_votes, 100_000_000);
    assert_eq!(pool.no_votes, 0);

    // Advance past vote deadline
    env.ledger().set_timestamp(pool.vote_deadline + 1);

    // Check creator balance before finalize
    let token_client = token::Client::new(&env, &token);
    let creator_balance_before = token_client.balance(&creator);

    // Finalize
    client.finalize(&pool_id);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.status, 2); // PAID

    // Creator received funds
    let creator_balance_after = token_client.balance(&creator);
    assert_eq!(creator_balance_after - creator_balance_before, 100_000_000);
}

#[test]
fn test_full_lifecycle_rejected() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);

    // Deposit
    client.deposit(&pool_id, &supporter, &100_000_000);

    // Creator submits work
    let work_hash = BytesN::from_array(&env, &[0x02u8; 32]);
    client.submit_work(&pool_id, &work_hash);

    // Supporter votes reject
    client.vote(&pool_id, &supporter, &false);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.yes_votes, 0);
    assert_eq!(pool.no_votes, 100_000_000);

    // Check supporter balance before finalize
    let token = pool.token;
    let token_client = token::Client::new(&env, &token);
    let supporter_balance_before = token_client.balance(&supporter);

    // Advance past vote deadline and finalize
    env.ledger().set_timestamp(pool.vote_deadline + 1);
    client.finalize(&pool_id);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.status, 3); // EXPIRED

    // Supporter got refunded
    let supporter_balance_after = token_client.balance(&supporter);
    assert!(supporter_balance_after >= supporter_balance_before + 100_000_000);
}

#[test]
fn test_expired_goal_not_met() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);
    let pool = client.get_pool(&pool_id).unwrap();
    let token = pool.token;

    // Deposit less than goal
    client.deposit(&pool_id, &supporter, &30_000_000);

    let token_client = token::Client::new(&env, &token);
    let supporter_balance_before = token_client.balance(&supporter);

    // Advance past pool deadline
    env.ledger().set_timestamp(pool.deadline + 1);
    client.finalize(&pool_id);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.status, 3); // EXPIRED

    let supporter_balance_after = token_client.balance(&supporter);
    assert!(supporter_balance_after >= supporter_balance_before + 30_000_000);
}

#[test]
#[should_panic(expected = "PoolError::AlreadyFinalized")]
fn test_double_finalize_panics() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);
    let pool = client.get_pool(&pool_id).unwrap();

    client.deposit(&pool_id, &supporter, &30_000_000);
    env.ledger().set_timestamp(pool.deadline + 1);
    client.finalize(&pool_id);
    client.finalize(&pool_id);
}

#[test]
#[should_panic(expected = "PoolError::AlreadyVoted")]
fn test_double_vote_panics() {
    let (env, _contract_id, creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);

    client.deposit(&pool_id, &supporter, &100_000_000);
    let work_hash = BytesN::from_array(&env, &[0x02u8; 32]);
    client.submit_work(&pool_id, &work_hash);
    client.vote(&pool_id, &supporter, &true);
    client.vote(&pool_id, &supporter, &false);
}

#[test]
fn test_multiple_supporters() {
    let env = Env::default();
    env.mock_all_auths();

    let creator = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    mint_tokens(&env, &token, &creator, 1_000_000_000);

    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    let goal = 100_000_000i128;
    let deadline = env.ledger().timestamp() + 86400;
    let metadata_hash = BytesN::from_array(&env, &[0x01u8; 32]);
    let pool_id = client.create(&creator, &goal, &deadline, &token, &metadata_hash);

    let supporter1 = Address::generate(&env);
    let supporter2 = Address::generate(&env);
    let supporter3 = Address::generate(&env);
    mint_tokens(&env, &token, &supporter1, 1_000_000_000);
    mint_tokens(&env, &token, &supporter2, 1_000_000_000);
    mint_tokens(&env, &token, &supporter3, 1_000_000_000);

    client.deposit(&pool_id, &supporter1, &40_000_000);
    client.deposit(&pool_id, &supporter2, &35_000_000);
    client.deposit(&pool_id, &supporter3, &25_000_000);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.total_deposited, 100_000_000);
    assert_eq!(pool.total_supporters, 3);

    let work_hash = BytesN::from_array(&env, &[0x02u8; 32]);
    client.submit_work(&pool_id, &work_hash);

    client.vote(&pool_id, &supporter1, &true);
    client.vote(&pool_id, &supporter2, &true);
    client.vote(&pool_id, &supporter3, &false);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.yes_votes, 75_000_000);
    assert_eq!(pool.no_votes, 25_000_000);

    env.ledger().set_timestamp(pool.vote_deadline + 1);

    let token_client = token::Client::new(&env, &token);
    let creator_balance_before = token_client.balance(&creator);
    client.finalize(&pool_id);
    let creator_balance_after = token_client.balance(&creator);
    assert_eq!(creator_balance_after - creator_balance_before, 100_000_000);
}
