use soroban_sdk::{contracterror, contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Pool {
    pub creator: Address,
    pub token: Address,
    pub goal: i128,
    pub total_deposited: i128,
    pub deadline: u64,
    pub status: u32,
    pub work_hash: Option<BytesN<32>>,
    pub vote_deadline: u64,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub metadata_hash: BytesN<32>,
    pub total_supporters: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Supporter {
    pub amount: i128,
    pub voted: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SupporterSnapshot {
    pub address: Address,
    pub amount: i128,
}

#[contracttype]
pub enum DataKey {
    Pool(u32),
    PoolCount,
    Supporter(u32, Address),
    SupporterList(u32),
}

#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PoolError {
    NotInitialized = 1,
    PoolNotFound = 2,
    InvalidGoal = 3,
    InvalidDeadline = 4,
    PoolNotOpen = 5,
    DeadlinePassed = 6,
    NotCreator = 7,
    NotSupporter = 8,
    AlreadyVoted = 9,
    NoWorkSubmitted = 10,
    WorkAlreadySubmitted = 11,
    VoteDeadlinePassed = 12,
    VoteDeadlineNotReached = 13,
    AlreadyFinalized = 14,
    TransferFailed = 15,
    InsufficientBalance = 16,
    MathOverflow = 17,
    NotEnoughSupporters = 18,
}

// Events
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolCreatedEvent {
    pub pool_id: u32,
    pub creator: Address,
    pub goal: i128,
    pub deadline: u64,
    pub token: Address,
    pub metadata_hash: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositedEvent {
    pub pool_id: u32,
    pub supporter: Address,
    pub amount: i128,
    pub total_deposited: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct GoalReachedEvent {
    pub pool_id: u32,
    pub total_deposited: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct WorkSubmittedEvent {
    pub pool_id: u32,
    pub work_hash: BytesN<32>,
    pub vote_deadline: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteCastEvent {
    pub pool_id: u32,
    pub voter: Address,
    pub approve: bool,
    pub weight: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolPaidEvent {
    pub pool_id: u32,
    pub creator: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolRefundedEvent {
    pub pool_id: u32,
    pub reason: u32,
}

pub const STATUS_OPEN: u32 = 0;
pub const STATUS_AWAITING_VOTE: u32 = 1;
pub const STATUS_PAID: u32 = 2;
pub const STATUS_EXPIRED: u32 = 3;

pub const REFUND_REASON_REJECTED: u32 = 0;
pub const REFUND_REASON_EXPIRED: u32 = 1;

pub const TOPIC_POOL_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_creat");
pub const TOPIC_DEPOSITED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_dep");
pub const TOPIC_GOAL_REACHED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_goal");
pub const TOPIC_WORK_SUBMITTED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_work");
pub const TOPIC_VOTE_CAST: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_vote");
pub const TOPIC_POOL_PAID: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_paid");
pub const TOPIC_POOL_REFUNDED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_ref");
