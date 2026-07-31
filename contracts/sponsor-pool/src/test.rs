#![cfg(test)]

use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, token, Address, BytesN, Env};

use crate::{SponsorPool, SponsorPoolClient};

#[allow(deprecated)]
fn create_token(env: &Env, admin: &Address) -> Address {
    let contract_id = env.register_stellar_asset_contract(admin.clone());
    contract_id
}

fn mint_tokens(env: &Env, token_id: &Address, to: &Address, amount: i128) {
    let token_client = token::StellarAssetClient::new(env, token_id);
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
#[should_panic(expected = "Error(Contract, #3)")]
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
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_pool_past_deadline() {
    let env = Env::default();
    env.mock_all_auths();
    let creator = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token(&env, &admin);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    env.ledger().set_timestamp(1_000_000);
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
#[should_panic(expected = "Error(Contract, #6)")]
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
    env.ledger().set_timestamp(1_000_000);
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
    assert!(pool.work_submitted);
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
#[should_panic(expected = "Error(Contract, #14)")]
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
#[should_panic(expected = "Error(Contract, #9)")]
fn test_double_vote_panics() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
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

// ─── Issue #1 Regression Tests ─────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #32)")]
fn test_non_admin_set_fee_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    // Deployer calls initialize(admin)
    client.initialize(&admin, &admin);

    // Attacker tries to set fee + redirect treasury
    client.set_fee(&attacker, &500, &attacker);
}

#[test]
#[should_panic(expected = "Error(Contract, #32)")]
fn test_non_admin_withdraw_fees_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    client.initialize(&admin, &admin);
    client.withdraw_fees(&attacker, &100);
}

#[test]
#[should_panic(expected = "Error(Contract, #33)")]
fn test_wrong_pending_admin_accept_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let impostor = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    client.initialize(&admin, &admin);
    client.propose_admin(&admin, &new_admin);
    // Impostor (not the pending admin) tries to accept
    client.accept_admin(&impostor);
}

#[test]
fn test_admin_transfer_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);

    client.initialize(&admin, &admin);
    assert_eq!(client.get_admin(), admin);

    client.propose_admin(&admin, &new_admin);
    client.accept_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #34)")]
fn test_deposit_while_paused_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let supporter = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    mint_tokens(&env, &token, &supporter, 1_000_000_000);

    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    let creator = Address::generate(&env);
    env.ledger().set_timestamp(1_000_000);
    let deadline = env.ledger().timestamp() + 86400;
    let pool_id = client.create(&creator, &100_000_000, &deadline, &token, &BytesN::from_array(&env, &[0x01u8; 32]));

    // Admin schedules pause, advances 24h, pauses
    client.schedule_pause(&admin);
    env.ledger().set_timestamp(env.ledger().timestamp() + 86400);
    client.pause(&admin);
    assert!(client.get_paused());

    // Deposit must revert with ContractPaused
    client.deposit(&pool_id, &supporter, &50_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #35)")]
fn test_pause_before_notice_reverts() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    env.ledger().set_timestamp(1_000_000);
    // No schedule_pause called — pause must fail with PauseNoticeNotElapsed
    client.pause(&admin);
}

#[test]
fn test_contract_version() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    assert_eq!(client.get_contract_version(), 3);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_non_creator_cannot_submit_work_on_used_pool() {
    let (env, _contract_id, _creator, supporter, pool_id) = setup_pool();
    let client = SponsorPoolClient::new(&env, &_contract_id);

    client.deposit(&pool_id, &supporter, &100_000_000);
    let work_hash = BytesN::from_array(&env, &[0x02u8; 32]);
    // Creator submits first (pool -> AWAITING_VOTE)
    client.submit_work(&pool_id, &work_hash);
    // Non-creator (supporter) tries to submit — status check fires #5
    client.submit_work(&pool_id, &work_hash);
}

// ─── Flow Constants Tests (Issue #1, A2) ───────────────────────

#[test]
fn test_flow_constants_defaults() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    // Defaults: 7d vote, 24h notice, 48h cooldown
    let (vote, notice, cooldown) = client.get_flow_constants();
    assert_eq!(vote, 604800);
    assert_eq!(notice, 86400);
    assert_eq!(cooldown, 172800);
}

#[test]
fn test_set_flow_constants_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    client.set_flow_constants(&admin, &120, &60, &60);
    let (vote, notice, cooldown) = client.get_flow_constants();
    assert_eq!(vote, 120);
    assert_eq!(notice, 60);
    assert_eq!(cooldown, 60);
}

#[test]
#[should_panic(expected = "Error(Contract, #32)")]
fn test_set_flow_constants_non_admin_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    client.set_flow_constants(&attacker, &120, &60, &60);
}

#[test]
#[should_panic(expected = "Error(Contract, #39)")]
fn test_set_flow_constants_below_floor_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);

    // 30s vote deadline < 60s floor
    client.set_flow_constants(&admin, &30, &60, &60);
}

#[test]
fn test_compressed_pause_cycle() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    env.ledger().set_timestamp(1_000_000);

    // Create pool BEFORE pausing (create is pause-gated)
    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    mint_tokens(&env, &token, &supporter, 1_000_000_000);
    let deadline = env.ledger().timestamp() + 86400;
    let pool_id = client.create(&creator, &100_000_000, &deadline, &token, &BytesN::from_array(&env, &[0x01u8; 32]));

    // Compress timelocks for test
    client.set_flow_constants(&admin, &120, &60, &60);
    client.schedule_pause(&admin);
    env.ledger().set_timestamp(env.ledger().timestamp() + 60);
    client.pause(&admin);
    assert!(client.get_paused());

    // Deposit blocked while paused
    let deposit_result = client.try_deposit(&pool_id, &supporter, &50_000_000);
    assert!(deposit_result.is_err());

    // Unpause after cooldown (60s compressed)
    env.ledger().set_timestamp(env.ledger().timestamp() + 60);
    client.unpause(&admin);
    assert!(!client.get_paused());

    // Deposit works again
    client.deposit(&pool_id, &supporter, &50_000_000);
    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.total_deposited, 50_000_000);
}

#[test]
fn test_compressed_vote_deadline_allows_quick_finalize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    env.ledger().set_timestamp(1_000_000);

    // Compress vote deadline to 120s
    client.set_flow_constants(&admin, &120, &60, &60);

    let creator = Address::generate(&env);
    let supporter = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    mint_tokens(&env, &token, &supporter, 1_000_000_000);

    let pool_id = client.create(&creator, &100_000_000, &(env.ledger().timestamp() + 3600), &token, &BytesN::from_array(&env, &[0x01u8; 32]));
    client.deposit(&pool_id, &supporter, &100_000_000);
    client.submit_work(&pool_id, &BytesN::from_array(&env, &[0x02u8; 32]));
    client.vote(&pool_id, &supporter, &true);

    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.vote_deadline, 1_000_120); // now(1_000_000) + 120

    // Advance past compressed vote deadline
    env.ledger().set_timestamp(1_000_121);
    let token_client = token::Client::new(&env, &token);
    let creator_before = token_client.balance(&creator);
    client.finalize(&pool_id);
    let creator_after = token_client.balance(&creator);
    assert_eq!(creator_after - creator_before, 100_000_000);
    assert_eq!(client.get_pool(&pool_id).unwrap().status, 2); // PAID
}

#[test]
fn test_contract_version_is_three() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    assert_eq!(client.get_contract_version(), 3);
}

// ─── Clean-Error Regression Tests (WasmVm trap fix) ────────────

#[test]
#[should_panic(expected = "Error(Contract, #33)")]
fn test_accept_admin_no_pending_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let caller = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    // No pending admin exists — must return clean #33 (not WasmVm trap)
    client.accept_admin(&caller);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_get_pool_nonexistent_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    // Nonexistent pool — must return clean #2 (not trap)
    client.deposit(&999, &admin, &100);
}

#[test]
#[should_panic(expected = "Error(Contract, #38)")]
fn test_withdraw_fees_no_balance_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    // No fees collected — clean #38 (balance guard precedes treasury lookup)
    client.withdraw_fees(&admin, &1);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_raise_dispute_nonexistent_pool_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    client.raise_dispute(&999, &admin, &0u32, &BytesN::from_array(&env, &[0x03u8; 32]));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_close_dispute_nonexistent_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    client.close_dispute(&1, &1);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_appeal_dispute_nonexistent_clean_error() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, SponsorPool);
    let client = SponsorPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &admin);
    client.appeal_dispute(&1, &admin, &1);
}
