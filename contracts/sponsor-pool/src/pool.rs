use soroban_sdk::{panic_with_error, token, Address, BytesN, Env, Vec};

use crate::types::*;

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

fn get_supporter(env: &Env, pool_id: u32, address: &Address) -> Supporter {
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
        work_hash: None,
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

    let mut supporter_state = get_supporter(env, pool_id, supporter);
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

    if pool.status != STATUS_OPEN {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    if pool.work_hash.is_some() {
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

    pool.work_hash = Some(work_hash.clone());
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

    let pool = get_pool_internal(env, pool_id);

    if pool.status != STATUS_AWAITING_VOTE {
        panic_with_error!(env, PoolError::PoolNotOpen);
    }

    let now = env.ledger().timestamp();
    if now >= pool.vote_deadline {
        panic_with_error!(env, PoolError::VoteDeadlinePassed);
    }

    let supporter_state = get_supporter(env, pool_id, voter);
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

    if goal_met && pool.work_hash.is_some() && approved {
        // --- PAYOUT to creator ---
        let amount = pool.total_deposited;
        token_client.transfer(&env.current_contract_address(), &pool.creator, &amount);

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

pub fn get_pool(env: &Env, pool_id: u32) -> Option<Pool> {
    env.storage()
        .instance()
        .get::<DataKey, Pool>(&DataKey::Pool(pool_id))
}
