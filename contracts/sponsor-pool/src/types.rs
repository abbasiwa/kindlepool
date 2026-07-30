use soroban_sdk::{contracterror, contracttype, Address, BytesN, Vec};

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
    NoDisputeToResolve = 19,
    DisputeAlreadyRaised = 20,
    NotDisputant = 21,
    DisputeFeeInsufficient = 22,
    AppealDeadlinePassed = 23,
    AlreadyAppealed = 24,
    NotArbitrator = 25,
    AlreadyVotedOnDispute = 26,
    PoolNotDisputed = 27,
    AppealLimitReached = 28,
    NotEnoughArbitrators = 29,
    FeeTooHigh = 30,
    FeeTreasuryNotSet = 31,
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

pub const STATUS_DISPUTED: u32 = 4;
pub const STATUS_APPEALED: u32 = 5;

pub const REFERRAL_BONUS_BPS: i128 = 50; // 0.5% of pool goal to referrer

pub const DISPUTE_REASON_REJECTED: u32 = 0;
pub const DISPUTE_REASON_NO_DELIVERY: u32 = 1;

pub const DISPUTE_FEE_BPS: i128 = 100; // 1% fee for raising dispute

pub const TOPIC_POOL_CREATED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_creat");
pub const TOPIC_DEPOSITED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_dep");
pub const TOPIC_GOAL_REACHED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_goal");
pub const TOPIC_WORK_SUBMITTED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_work");
pub const TOPIC_VOTE_CAST: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_vote");
pub const TOPIC_POOL_PAID: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_paid");
pub const TOPIC_POOL_REFUNDED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_ref");
pub const TOPIC_DISPUTE_RAISED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_disp");
pub const TOPIC_DISPUTE_RESOLVED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_resl");
pub const TOPIC_ARBITRATOR_VOTED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_arbv");
pub const TOPIC_REFERRAL_REGISTERED: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_refr");
pub const TOPIC_REFERRAL_REWARD: soroban_sdk::Symbol = soroban_sdk::symbol_short!("p_rrwd");

// Dispute types
#[contracttype]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub pool_id: u32,
    pub raised_by: Address,
    pub reason: u32,
    pub evidence_hash: BytesN<32>,
    pub fee: i128,
    pub status: u32, // 0=open, 1=resolved_for_creator, 2=resolved_for_supporters, 3=appealed
    pub created_at: u64,
    pub resolved_at: u64,
    pub appeal_count: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArbitratorVote {
    pub arbitrator: Address,
    pub vote_for_creator: bool,
    pub weight: i128,
    pub reason_hash: BytesN<32>,
}

#[contracttype]
pub enum DataKey {
    Pool(u32),
    PoolCount,
    Supporter(u32, Address),
    SupporterList(u32),
    Dispute(u32),
    DisputeCount,
    ArbitratorVote(u32, Address),
    ArbitratorVoteList(u32),
    FeeBps,
    FeeTreasury,
    FeeTotal,
    Referral(Address),
    ReferralRewards(Address),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DisputeRaisedEvent {
    pub pool_id: u32,
    pub raised_by: Address,
    pub reason: u32,
    pub fee: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DisputeResolvedEvent {
    pub pool_id: u32,
    pub resolution: u32,
    pub votes_for_creator: i128,
    pub votes_against_creator: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReferralRegisteredEvent {
    pub referrer: Address,
    pub referee: Address,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReferralRewardEvent {
    pub referrer: Address,
    pub pool_id: u32,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Referral {
    pub referee: Address,
    pub pool_id: u32,
    pub reward: i128,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ArbitratorVoteEvent {
    pub pool_id: u32,
    pub arbitrator: Address,
    pub vote_for_creator: bool,
    pub weight: i128,
}
