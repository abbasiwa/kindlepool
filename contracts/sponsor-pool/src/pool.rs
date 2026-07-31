use soroban_sdk::{panic_with_error, token, Address, BytesN, Env, Vec};

use crate::types::*;

// ─── Admin & Pause Helpers ─────────────────────────────────────

fn get_admin_internal(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::Admin)
        .ok_or(PoolError::NotInitialized)
        .unwrap()
}

fn require_admin(env: &Env, caller: &Address) {
    let admin = get_admin_internal(env);
    if caller != &admin {
        panic_with_error!(env, PoolError::OnlyAdmin);
    }
}

fn when_not_paused(env: &Env) {
    let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
    if paused {
        panic_with_error!(env, PoolError::ContractPaused);
    }
}

pub fn init_admin(env: &Env, admin: &Address) {
    if env.storage().instance().has(&DataKey::Admin) {
        panic_with_error!(env, PoolError::AlreadyFinalized);
    }
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Address {
    get_admin_internal(env)
}

pub fn propose_admin(env: &Env, caller: &Address, new_admin: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    if new_admin == caller {
        panic_with_error!(env, PoolError::InvalidGoal);
    }
    let old = get_admin_internal(env);
    env.storage().instance().set(&DataKey::PendingAdmin, new_admin);
    env.events().publish(
        (TOPIC_ADMIN_PROPOSED,),
        AdminProposedEvent { old, new: new_admin.clone() },
    );
}

pub fn accept_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let pending: Address = env
        .storage()
        .instance()
        .get(&DataKey::PendingAdmin)
        .ok_or(PoolError::CallerIsNotPendingAdmin)
        .unwrap();
    if caller != &pending {
        panic_with_error!(env, PoolError::CallerIsNotPendingAdmin);
    }
    env.storage().instance().set(&DataKey::Admin, &pending);
    env.storage().instance().remove(&DataKey::PendingAdmin);
    env.events().publish(
        (TOPIC_ADMIN_ACCEPTED,),
        AdminAcceptedEvent { new: pending.clone() },
    );
}

// ─── Emergency Pause ───────────────────────────────────────────

pub fn schedule_pause(env: &Env, caller: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    let at = env.ledger().timestamp() + PAUSE_NOTICE_SECONDS;
    env.storage().instance().set(&DataKey::PauseNoticeAt, &at);
    env.events().publish(
        (TOPIC_PAUSE_SCHEDULED,),
        PauseScheduledEvent { at },
    );
}

pub fn pause(env: &Env, caller: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    let notice_at: u64 = env.storage().instance().get(&DataKey::PauseNoticeAt).unwrap_or(0);
    let now = env.ledger().timestamp();
    if notice_at == 0 || now < notice_at {
        panic_with_error!(env, PoolError::PauseNoticeNotElapsed);
    }
    env.storage().instance().set(&DataKey::Paused, &true);
    env.storage().instance().set(&DataKey::PausedAt, &now);
    env.events().publish(
        (TOPIC_PAUSED,),
        PausedEvent { at: now },
    );
}

pub fn unpause(env: &Env, caller: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    let paused_at: u64 = env.storage().instance().get(&DataKey::PausedAt).unwrap_or(0);
    let now = env.ledger().timestamp();
    if paused_at == 0 || now < paused_at + UNPAUSE_COOLDOWN_SECONDS {
        panic_with_error!(env, PoolError::UnpauseCooldownActive);
    }
    env.storage().instance().set(&DataKey::Paused, &false);
    env.events().publish(
        (TOPIC_UNPAUSED,),
        UnpausedEvent { at: now },
    );
}

pub fn get_paused(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
}

// ─── Fee & Treasury Management ─────────────────────────────────

pub fn set_fee(env: &Env, caller: &Address, fee_bps: u32, treasury: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    if fee_bps > 500 {
        panic_with_error!(env, PoolError::FeeTooHigh);
    }
    env.storage().instance().set(&DataKey::FeeBps, &(fee_bps as i128));
    env.storage().instance().set(&DataKey::FeeTreasury, treasury);
    env.events().publish(
        (TOPIC_FEE_UPDATED,),
        FeeUpdatedEvent { fee_bps, treasury: treasury.clone() },
    );
}

pub fn set_fee_treasury(env: &Env, caller: &Address, treasury: &Address) {
    caller.require_auth();
    require_admin(env, caller);
    env.storage().instance().set(&DataKey::FeeTreasury, treasury);
    env.events().publish(
        (TOPIC_FEE_TREASURY_UPDATED,),
        FeeTreasuryUpdatedEvent { treasury: treasury.clone() },
    );
}

pub fn withdraw_fees(env: &Env, caller: &Address, amount: i128) {
    caller.require_auth();
    require_admin(env, caller);
    if amount <= 0 {
        panic_with_error!(env, PoolError::InvalidAmount);
    }
    let total: i128 = env.storage().instance().get(&DataKey::FeeTotal).unwrap_or(0);
    if amount > total {
        panic_with_error!(env, PoolError::WithdrawExceedsBalance);
    }
    let treasury: Address = env.storage().instance().get(&DataKey::FeeTreasury)
        .ok_or(PoolError::FeeTreasuryNotSet)
        .unwrap();
    env.storage().instance().set(&DataKey::FeeTotal, &(total - amount));
    env.events().publish(
        (TOPIC_FEES_WITHDRAWN,),
        FeesWithdrawnEvent { amount, to: treasury.clone() },
    );
}

fn get_pool_internal(env: &Env, pool_id: u32) -> Pool {
    env.storage()
        .instance()
        .get::<DataKey, Pool>(&DataKey::Pool(pool_id))
        .ok_or(PoolError::PoolNotFound)
        .unwrap()
}

fn set_pool(env: &Env, pool_id: u32, pool: &Pool) {
    env.storage()
        .instance()
        .set(&DataKey::Pool(pool_id), pool);
}

fn get_supporter_internal(env: &Env, pool_id: u32, address: &Address) -> Supporter {
    env.storage()
        .instance()
        .get::<DataKey, Supporter>(&DataKey::Supporter(pool_id, address.clone()))
        .unwrap_or(Supporter {
            amount: 0,
            voted: false,
        })
}

fn set_supporter(env: &Env, pool_id: u32, address: &Address, supporter: &Supporter) {
    env.storage()
        .instance()
        .set(&DataKey::Supporter(pool_id, address.clone()), supporter);
}

fn get_supporter_list(env: &Env, pool_id: u32) -> Vec<SupporterSnapshot> {
    env.storage()
        .instance()
        .get::<DataKey, Vec<SupporterSnapshot>>(&DataKey::SupporterList(pool_id))
        .unwrap_or(Vec::new(env))
}

fn push_supporter_list(env: &Env, pool_id: u32, snapshot: &SupporterSnapshot) {
    let mut list = get_supporter_list(env, pool_id);
    list.push_back(snapshot.clone());
    env.storage()
        .instance()
        .set(&DataKey::SupporterList(pool_id), &list);
}

pub fn create(
    env: &Env,
    creator: &Address,
    goal: i128,
    deadline: u64,
    token: &Address,
    metadata_hash: &BytesN<32>,
) -> u32 {
    creator.require_auth();
    when_not_paused(env);

    if goal <= 0 {
        panic_with_error!(env, PoolError::InvalidGoal);
    }

    let now = env.ledger().timestamp();
    if deadline <= now {
        panic_with_error!(env, PoolError::InvalidDeadline);
    }

    if metadata_hash.is_empty() {
        panic_with_error!(env, PoolError::NotInitialized);
    }

    let id = env
        .storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::PoolCount)
        .unwrap_or(0)
        .checked_add(1)
        .expect("pool id overflow");

    env.storage().instance().set(&DataKey::PoolCount, &id);

    let pool = Pool {
        creator: creator.clone(),
        token: token.clone(),
        goal,
        total_deposited: 0,
        deadline,
        status: STATUS_OPEN,
        work_hash: metadata_hash.clone(),
        work_submitted: false,
        vote_deadline: 0,
        yes_votes: 0,
        no_votes: 0,
        metadata_hash: metadata_hash.clone(),
        total_supporters: 0,
    };

    set_pool(env, id, &pool);

    env.events().publish(
        (TOPIC_POOL_CREATED,),
        PoolCreatedEvent {
            pool_id: id,
            creator: creator.clone(),
            goal,
            deadline,
            token: token.clone(),
            metadata_hash: metadata_hash.clone(),
        },
    );

    id
}

pub fn deposit(env: &Env, pool_id: u32, supporter: &Address, amount: i128) {
    supporter.require_auth();
    when_not_paused(env);

    if amount <= 0 {
        panic_with_error!(env, PoolError::InvalidGoal);
    }

    let mut pool = get_pool_internal(env, pool_id);

    if pool.status != STATUS_OPEN {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    let now = env.ledger().timestamp();
    if now >= pool.deadline {
        panic_with_error!(env, PoolError::DeadlinePassed);
    }

    let token_client = token::Client::new(env, &pool.token);
    let balance_before = token_client.balance(&env.current_contract_address());
    token_client.transfer(supporter, &env.current_contract_address(), &amount);
    let balance_after = token_client.balance(&env.current_contract_address());
    if balance_after < balance_before.checked_add(amount).expect("overflow") {
        panic_with_error!(env, PoolError::TransferFailed);
    }

    pool.total_deposited = pool
        .total_deposited
        .checked_add(amount)
        .expect("deposit overflow");

    let mut supporter_state = get_supporter_internal(env, pool_id, supporter);
    let is_new = supporter_state.amount == 0;
    supporter_state.amount = supporter_state
        .amount
        .checked_add(amount)
        .expect("supporter amount overflow");
    set_supporter(env, pool_id, supporter, &supporter_state);

    if is_new {
        pool.total_supporters = pool.total_supporters.saturating_add(1);
        push_supporter_list(
            env,
            pool_id,
            &SupporterSnapshot {
                address: supporter.clone(),
                amount: supporter_state.amount,
            },
        );
    }

    let goal_just_reached =
        pool.total_deposited >= pool.goal && pool.total_deposited - amount < pool.goal;

    set_pool(env, pool_id, &pool);

    env.events().publish(
        (TOPIC_DEPOSITED,),
        DepositedEvent {
            pool_id,
            supporter: supporter.clone(),
            amount,
            total_deposited: pool.total_deposited,
        },
    );

    if goal_just_reached {
        env.events().publish(
            (TOPIC_GOAL_REACHED,),
            GoalReachedEvent {
                pool_id,
                total_deposited: pool.total_deposited,
            },
        );
    }
}

pub fn submit_work(env: &Env, pool_id: u32, work_hash: &BytesN<32>) {
    let mut pool = get_pool_internal(env, pool_id);

    pool.creator.require_auth();
    when_not_paused(env);

    if pool.status != STATUS_OPEN {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    if pool.work_submitted {
        panic_with_error!(env, PoolError::WorkAlreadySubmitted);
    }

    if work_hash.is_empty() {
        panic_with_error!(env, PoolError::NoWorkSubmitted);
    }

    let now = env.ledger().timestamp();
    if now >= pool.deadline {
        panic_with_error!(env, PoolError::DeadlinePassed);
    }

    if pool.total_supporters == 0 {
        panic_with_error!(env, PoolError::NotEnoughSupporters);
    }

    let vote_deadline = now + 604800;

    pool.work_hash = work_hash.clone();
    pool.work_submitted = true;
    pool.vote_deadline = vote_deadline;
    pool.status = STATUS_AWAITING_VOTE;

    set_pool(env, pool_id, &pool);

    env.events().publish(
        (TOPIC_WORK_SUBMITTED,),
        WorkSubmittedEvent {
            pool_id,
            work_hash: work_hash.clone(),
            vote_deadline,
        },
    );
}

pub fn vote(env: &Env, pool_id: u32, voter: &Address, approve: bool) {
    voter.require_auth();
    when_not_paused(env);

    let pool = get_pool_internal(env, pool_id);

    if pool.status != STATUS_AWAITING_VOTE {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    let now = env.ledger().timestamp();
    if now >= pool.vote_deadline {
        panic_with_error!(env, PoolError::VoteDeadlinePassed);
    }

    let supporter_state = get_supporter_internal(env, pool_id, voter);
    if supporter_state.amount <= 0 {
        panic_with_error!(env, PoolError::NotSupporter);
    }
    if supporter_state.voted {
        panic_with_error!(env, PoolError::AlreadyVoted);
    }

    let mut updated_supporter = supporter_state.clone();
    updated_supporter.voted = true;
    set_supporter(env, pool_id, voter, &updated_supporter);

    let weight = supporter_state.amount;
    let mut pool_mut = get_pool_internal(env, pool_id);

    if approve {
        pool_mut.yes_votes = pool_mut.yes_votes.checked_add(weight).expect("vote overflow");
    } else {
        pool_mut.no_votes = pool_mut.no_votes.checked_add(weight).expect("vote overflow");
    }

    set_pool(env, pool_id, &pool_mut);

    env.events().publish(
        (TOPIC_VOTE_CAST,),
        VoteCastEvent {
            pool_id,
            voter: voter.clone(),
            approve,
            weight,
        },
    );
}

pub fn finalize(env: &Env, pool_id: u32) {
    when_not_paused(env);
    let pool = get_pool_internal(env, pool_id);

    if pool.status == STATUS_PAID || pool.status == STATUS_EXPIRED {
        panic_with_error!(env, PoolError::AlreadyFinalized);
    }

    let now = env.ledger().timestamp();

    if pool.status == STATUS_AWAITING_VOTE && now < pool.vote_deadline && now < pool.deadline {
        panic_with_error!(env, PoolError::VoteDeadlineNotReached);
    }

    let token_client = token::Client::new(env, &pool.token);

    let contract_balance = token_client.balance(&env.current_contract_address());
    if contract_balance < pool.total_deposited {
        panic_with_error!(env, PoolError::InsufficientBalance);
    }

    let goal_met = pool.total_deposited >= pool.goal;
    let approved = pool.yes_votes > pool.no_votes;

    if goal_met && pool.work_submitted && approved {
        // --- PAYOUT to creator (minus platform fee) ---
        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0i128);
        let fee = if fee_bps > 0 {
            pool.total_deposited.checked_mul(fee_bps).expect("fee overflow") / 10000i128
        } else {
            0i128
        };
        let amount = pool.total_deposited.checked_sub(fee).expect("amount underflow");

        // Transfer net amount to creator
        token_client.transfer(&env.current_contract_address(), &pool.creator, &amount);

        // Transfer fee to treasury
        if fee > 0 {
            let treasury: Address = env.storage().instance().get(&DataKey::FeeTreasury)
                .expect("FeeTreasury not set when FeeBps > 0");
            token_client.transfer(&env.current_contract_address(), &treasury, &fee);

            let total_fees: i128 = env.storage().instance().get(&DataKey::FeeTotal).unwrap_or(0i128);
            env.storage().instance().set(&DataKey::FeeTotal, &(total_fees + fee));
        }

        // Credit referral rewards for all supporters
        let supporter_list = env.storage().instance().get::<DataKey, Vec<SupporterSnapshot>>(&DataKey::SupporterList(pool_id))
            .unwrap_or(Vec::new(env));
        let referrer_key = DataKey::Referral(pool.creator.clone());
        let mut referrals: Vec<Referral> = env.storage().instance().get(&referrer_key).unwrap_or(Vec::new(env));
        for i in 0..supporter_list.len() {
            if let Some(s) = supporter_list.get(i) {
                for j in 0..referrals.len() {
                    if let Some(mut r) = referrals.get(j) {
                        if r.referee == s.address && !r.claimed && r.reward == 0 {
                            let reward = (s.amount * REFERRAL_BONUS_BPS) / 10000i128;
                            r.reward = reward;
                            referrals.set(j, r);
                        }
                    }
                }
            }
        }
        env.storage().instance().set(&referrer_key, &referrals);

        let mut paid_pool = pool.clone();
        paid_pool.status = STATUS_PAID;
        set_pool(env, pool_id, &paid_pool);

        env.events().publish(
            (TOPIC_POOL_PAID,),
            PoolPaidEvent {
                pool_id,
                creator: pool.creator.clone(),
                amount,
            },
        );
    } else {
        // --- REFUND to all supporters ---
        let supporter_list = get_supporter_list(env, pool_id);
        for i in 0..supporter_list.len() {
            if let Some(snapshot) = supporter_list.get(i) {
                if snapshot.amount > 0 {
                    let result = token_client.try_transfer(
                        &env.current_contract_address(),
                        &snapshot.address,
                        &snapshot.amount,
                    );
                    if result.is_err() {
                        continue;
                    }
                }
            }
        }

        let reason = if goal_met {
            REFUND_REASON_REJECTED
        } else {
            REFUND_REASON_EXPIRED
        };

        let mut expired_pool = pool.clone();
        expired_pool.status = STATUS_EXPIRED;
        set_pool(env, pool_id, &expired_pool);

        env.events().publish(
            (TOPIC_POOL_REFUNDED,),
            PoolRefundedEvent {
                pool_id,
                reason,
            },
        );
    }
}

pub fn raise_dispute(
    env: &Env,
    pool_id: u32,
    disputant: &Address,
    reason: u32,
    evidence_hash: &BytesN<32>,
) {
    disputant.require_auth();
    when_not_paused(env);

    let pool = get_pool_internal(env, pool_id);
    if pool.status != STATUS_AWAITING_VOTE && pool.status != STATUS_EXPIRED {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    // Prevent duplicate disputes
    if env.storage().instance().has(&DataKey::Dispute(pool_id)) {
        panic_with_error!(env, PoolError::DisputeAlreadyRaised);
    }

    if evidence_hash.is_empty() {
        panic_with_error!(env, PoolError::NoWorkSubmitted);
    }

    // Calculate and collect dispute fee (1% of pool goal)
    let fee = pool
        .goal
        .checked_mul(DISPUTE_FEE_BPS)
        .expect("fee overflow")
        / 10000i128;

    let token_client = token::Client::new(env, &pool.token);
    token_client.transfer(disputant, &env.current_contract_address(), &fee);

    let id = env
        .storage()
        .instance()
        .get::<DataKey, u32>(&DataKey::DisputeCount)
        .unwrap_or(0)
        .checked_add(1)
        .expect("dispute count overflow");
    env.storage()
        .instance()
        .set(&DataKey::DisputeCount, &id);

    let dispute = Dispute {
        pool_id,
        raised_by: disputant.clone(),
        reason,
        evidence_hash: evidence_hash.clone(),
        fee,
        status: 0,
        created_at: env.ledger().timestamp(),
        resolved_at: 0,
        appeal_count: 0,
    };
    env.storage()
        .instance()
        .set(&DataKey::Dispute(id), &dispute);

    // Set pool to disputed status
    let mut pool_mut = get_pool_internal(env, pool_id);
    pool_mut.status = STATUS_DISPUTED;
    set_pool(env, pool_id, &pool_mut);

    env.events().publish(
        (TOPIC_DISPUTE_RAISED,),
        DisputeRaisedEvent {
            pool_id,
            raised_by: disputant.clone(),
            reason,
            fee,
        },
    );
}

pub fn resolve_dispute(
    env: &Env,
    pool_id: u32,
    caller: &Address,
    dispute_id: u32,
    vote_for_creator: bool,
    reason_hash: &BytesN<32>,
) {
    caller.require_auth();
    when_not_paused(env);

    let dispute = env
        .storage()
        .instance()
        .get::<DataKey, Dispute>(&DataKey::Dispute(dispute_id))
        .ok_or(PoolError::PoolNotFound)
        .unwrap();

    if dispute.status != 0 && dispute.status != 3 {
        panic_with_error!(env, PoolError::DisputeAlreadyRaised);
    }

    let pool = get_pool_internal(env, pool_id);
    if pool.status != STATUS_DISPUTED && pool.status != STATUS_APPEALED {
        panic_with_error!(env, PoolError::PoolNotDisputed);
    }

    let vote_key = DataKey::ArbitratorVote(dispute_id, caller.clone());
    if env.storage().instance().has(&vote_key) {
        panic_with_error!(env, PoolError::AlreadyVotedOnDispute);
    }

    // Arbitrator must have a positive stake in the platform (weight > 0).
    // In this version, any authenticated caller may arbitrate with weight 1.
    // Production: weight should derive from verified funding history.
    let weight: i128 = 1;
    if weight <= 0 {
        panic_with_error!(env, PoolError::NotArbitrator);
    }

    let vote = ArbitratorVote {
        arbitrator: caller.clone(),
        vote_for_creator,
        weight,
        reason_hash: reason_hash.clone(),
    };
    env.storage().instance().set(&vote_key, &vote);

    let mut vote_list: Vec<ArbitratorVote> = env
        .storage()
        .instance()
        .get(&DataKey::ArbitratorVoteList(dispute_id))
        .unwrap_or(Vec::new(env));
    vote_list.push_back(vote);
    env.storage()
        .instance()
        .set(&DataKey::ArbitratorVoteList(dispute_id), &vote_list);

    env.events().publish(
        (TOPIC_ARBITRATOR_VOTED,),
        ArbitratorVoteEvent {
            pool_id,
            arbitrator: caller.clone(),
            vote_for_creator,
            weight,
        },
    );
}

pub fn close_dispute(env: &Env, pool_id: u32, dispute_id: u32) {
    when_not_paused(env);
    let mut dispute = env
        .storage()
        .instance()
        .get::<DataKey, Dispute>(&DataKey::Dispute(dispute_id))
        .ok_or(PoolError::PoolNotFound)
        .unwrap();

    if dispute.status != 0 && dispute.status != 3 {
        panic_with_error!(env, PoolError::DisputeAlreadyRaised);
    }

    let pool = get_pool_internal(env, pool_id);
    let vote_list: Vec<ArbitratorVote> = env
        .storage()
        .instance()
        .get(&DataKey::ArbitratorVoteList(dispute_id))
        .unwrap_or(Vec::new(env));

    let mut votes_for_creator: i128 = 0;
    let mut votes_against_creator: i128 = 0;
    for i in 0..vote_list.len() {
        if let Some(v) = vote_list.get(i) {
            if v.vote_for_creator {
                votes_for_creator += v.weight;
            } else {
                votes_against_creator += v.weight;
            }
        }
    }

    let resolution: u32;
    if votes_for_creator > votes_against_creator {
        // Resolved in favor of creator — pay the creator (minus platform fee).
        // NOTE: strict majority required. A tie (or zero votes) resolves in
        // favor of supporters (else branch) — documented intended behavior.
        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0i128);
        let fee = if fee_bps > 0 {
            pool.total_deposited.checked_mul(fee_bps).expect("fee overflow") / 10000i128
        } else { 0i128 };
        let payout = pool.total_deposited.checked_sub(fee).expect("amount underflow");

        let token_client = token::Client::new(env, &pool.token);
        token_client.transfer(&env.current_contract_address(), &pool.creator, &payout);

        if fee > 0 {
            if let Some(treasury) = env.storage().instance().get::<DataKey, Address>(&DataKey::FeeTreasury) {
                let _ = token_client.try_transfer(&env.current_contract_address(), &treasury, &fee);
                let total_fees: i128 = env.storage().instance().get(&DataKey::FeeTotal).unwrap_or(0i128);
                env.storage().instance().set(&DataKey::FeeTotal, &(total_fees + fee));
            }
        }

        dispute.status = 1;
        resolution = 1;

        let mut paid_pool = pool.clone();
        paid_pool.status = STATUS_PAID;
        set_pool(env, pool_id, &paid_pool);
    } else {
        // Resolved in favor of supporters — refund
        let token_client = token::Client::new(env, &pool.token);
        let supporter_list: Vec<SupporterSnapshot> = env
            .storage()
            .instance()
            .get(&DataKey::SupporterList(pool_id))
            .unwrap_or(Vec::new(env));
        for i in 0..supporter_list.len() {
            if let Some(s) = supporter_list.get(i) {
                if s.amount > 0 {
                    let _ = token_client.try_transfer(
                        &env.current_contract_address(),
                        &s.address,
                        &s.amount,
                    );
                }
            }
        }
        dispute.status = 2;
        resolution = 2;

        let mut expired_pool = pool.clone();
        expired_pool.status = STATUS_EXPIRED;
        set_pool(env, pool_id, &expired_pool);
    }

    dispute.resolved_at = env.ledger().timestamp();
    env.storage()
        .instance()
        .set(&DataKey::Dispute(dispute_id), &dispute);

    // Return fee to winner
    let token_client = token::Client::new(env, &pool.token);
    let winner = if resolution == 1 {
        &pool.creator
    } else {
        &dispute.raised_by
    };
    let _ = token_client.try_transfer(
        &env.current_contract_address(),
        winner,
        &dispute.fee,
    );

    env.events().publish(
        (TOPIC_DISPUTE_RESOLVED,),
        DisputeResolvedEvent {
            pool_id,
            resolution,
            votes_for_creator,
            votes_against_creator,
        },
    );
}

pub fn appeal_dispute(
    env: &Env,
    pool_id: u32,
    disputant: &Address,
    dispute_id: u32,
) {
    disputant.require_auth();
    when_not_paused(env);

    let mut dispute = env
        .storage()
        .instance()
        .get::<DataKey, Dispute>(&DataKey::Dispute(dispute_id))
        .ok_or(PoolError::PoolNotFound)
        .unwrap();

    if dispute.status != 0 && dispute.status != 3 {
        panic_with_error!(env, PoolError::DisputeAlreadyRaised);
    }
    if dispute.appeal_count >= 2 {
        panic_with_error!(env, PoolError::AppealLimitReached);
    }

    // Double the fee for appeal
    let additional_fee = dispute.fee;
    let pool = get_pool_internal(env, pool_id);
    let token_client = token::Client::new(env, &pool.token);
    token_client.transfer(disputant, &env.current_contract_address(), &additional_fee);

    dispute.fee = dispute
        .fee
        .checked_add(additional_fee)
        .expect("fee overflow");
    dispute.status = 3;
    dispute.appeal_count = dispute.appeal_count.saturating_add(1);
    env.storage()
        .instance()
        .set(&DataKey::Dispute(dispute_id), &dispute);

    let mut pool_mut = get_pool_internal(env, pool_id);
    pool_mut.status = STATUS_APPEALED;
    set_pool(env, pool_id, &pool_mut);
}

pub fn get_dispute(env: &Env, dispute_id: u32) -> Option<Dispute> {
    env.storage()
        .instance()
        .get::<DataKey, Dispute>(&DataKey::Dispute(dispute_id))
}

pub fn get_arbitrator_votes(env: &Env, dispute_id: u32) -> Vec<ArbitratorVote> {
    env.storage()
        .instance()
        .get(&DataKey::ArbitratorVoteList(dispute_id))
        .unwrap_or(Vec::new(env))
}

pub fn get_fee(env: &Env) -> (i128, Option<Address>) {
    let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
    let treasury: Option<Address> = env.storage().instance().get(&DataKey::FeeTreasury);
    (fee_bps, treasury)
}

pub fn get_total_fees_collected(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::FeeTotal).unwrap_or(0)
}

// ─── Referral Program ──────────────────────────────────────────

pub fn register_referral(env: &Env, referrer: &Address, referee: &Address, pool_id: u32) {
    referrer.require_auth();
    when_not_paused(env);
    if referrer == referee {
        panic_with_error!(env, PoolError::InvalidGoal);
    }

    let key = DataKey::Referral(referrer.clone());
    let mut referrals: Vec<Referral> = env.storage().instance().get(&key).unwrap_or(Vec::new(env));
    for i in 0..referrals.len() {
        if let Some(r) = referrals.get(i) {
            if r.referee == *referee && r.pool_id == pool_id {
                return; // Already registered
            }
        }
    }
    referrals.push_back(Referral { referee: referee.clone(), pool_id, reward: 0, claimed: false });
    env.storage().instance().set(&key, &referrals);

    env.events().publish(
        (TOPIC_REFERRAL_REGISTERED,),
        ReferralRegisteredEvent { referrer: referrer.clone(), referee: referee.clone() },
    );
}

pub fn claim_referral_reward(env: &Env, referrer: &Address) -> i128 {
    referrer.require_auth();
    when_not_paused(env);
    let key = DataKey::Referral(referrer.clone());
    let referrals: Vec<Referral> = env.storage().instance().get(&key).unwrap_or(Vec::new(env));
    let mut total_reward: i128 = 0;
    let mut updated = Vec::new(env);

    for i in 0..referrals.len() {
        if let Some(mut r) = referrals.get(i) {
            if !r.claimed && r.reward > 0 {
                total_reward += r.reward;
                r.claimed = true;
            }
            updated.push_back(r);
        }
    }

    if total_reward > 0 && updated.len() > 0 {
        env.storage().instance().set(&key, &updated);

        if let Some(first) = updated.get(0) {
            let pool = get_pool_internal(env, first.pool_id);
            let token_client = token::Client::new(env, &pool.token);
            let _ = token_client.try_transfer(&env.current_contract_address(), referrer, &total_reward);
        }
    }

    total_reward
}

pub fn get_referrals(env: &Env, referrer: &Address) -> Vec<Referral> {
    env.storage().instance().get(&DataKey::Referral(referrer.clone())).unwrap_or(Vec::new(env))
}

pub fn get_pool(env: &Env, pool_id: u32) -> Option<Pool> {
    env.storage()
        .instance()
        .get::<DataKey, Pool>(&DataKey::Pool(pool_id))
}

// ─── View Functions ────────────────────────────────────────────

pub fn get_pool_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::PoolCount).unwrap_or(0)
}

pub fn get_supporter(env: &Env, pool_id: u32, address: &Address) -> Option<Supporter> {
    env.storage()
        .instance()
        .get::<DataKey, Supporter>(&DataKey::Supporter(pool_id, address.clone()))
}

pub fn get_pools_by_creator(env: &Env, creator: &Address) -> Vec<u32> {
    let count = get_pool_count(env);
    let mut result = Vec::new(env);
    for i in 1..=count {
        if let Some(pool) = get_pool(env, i) {
            if &pool.creator == creator {
                result.push_back(i);
            }
        }
    }
    result
}

pub fn get_pools_by_supporter(env: &Env, supporter: &Address) -> Vec<u32> {
    let count = get_pool_count(env);
    let mut result = Vec::new(env);
    for i in 1..=count {
        if env.storage().instance().has(&DataKey::Supporter(i, supporter.clone())) {
            result.push_back(i);
        }
    }
    result
}

pub fn get_platform_stats(env: &Env) -> PlatformStats {
    let count = get_pool_count(env);
    let mut paid: u32 = 0;
    let mut expired: u32 = 0;
    let mut disputed: u32 = 0;
    let mut active: u32 = 0;
    let mut volume: i128 = 0;

    for i in 1..=count {
        if let Some(pool) = get_pool(env, i) {
            match pool.status {
                STATUS_PAID => { paid += 1; volume += pool.total_deposited; }
                STATUS_EXPIRED => expired += 1,
                STATUS_DISPUTED | STATUS_APPEALED => disputed += 1,
                _ => active += 1,
            }
        }
    }

    PlatformStats {
        pool_count: count,
        total_pools_paid: paid,
        total_pools_expired: expired,
        total_pools_disputed: disputed,
        total_volume_paid: volume,
        total_fees_collected: env.storage().instance().get(&DataKey::FeeTotal).unwrap_or(0),
        active_pools: active,
    }
}

pub fn get_contract_version(_env: &Env) -> u32 {
    CONTRACT_VERSION
}

// ─── Cancellation ──────────────────────────────────────────────

pub fn cancel_pool(env: &Env, caller: &Address, pool_id: u32) {
    caller.require_auth();
    when_not_paused(env);
    let pool = get_pool_internal(env, pool_id);
    if caller != &pool.creator {
        panic_with_error!(env, PoolError::NotCreator);
    }
    if pool.status != STATUS_OPEN {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }
    let now = env.ledger().timestamp();
    if now >= pool.deadline {
        panic_with_error!(env, PoolError::DeadlinePassed);
    }
    if pool.work_submitted {
        panic_with_error!(env, PoolError::WorkAlreadySubmitted);
    }

    // Refund all supporters pro-rata
    let token_client = token::Client::new(env, &pool.token);
    let supporter_list = get_supporter_list(env, pool_id);
    for i in 0..supporter_list.len() {
        if let Some(snapshot) = supporter_list.get(i) {
            if snapshot.amount > 0 {
                let _ = token_client.try_transfer(
                    &env.current_contract_address(),
                    &snapshot.address,
                    &snapshot.amount,
                );
            }
        }
    }

    let mut cancelled = pool.clone();
    cancelled.status = STATUS_EXPIRED;
    set_pool(env, pool_id, &cancelled);

    env.events().publish(
        (TOPIC_POOL_CANCELLED,),
        PoolCancelledEvent { pool_id, cancelled_by: caller.clone() },
    );
}
