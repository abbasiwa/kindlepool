# SponsorPool Contract — Formal Specification

**Version**: v6b (contract version 3)
**Testnet contract**: `CBFW4U4HO6Z6RPRRNPWA2MWPRXJSSR2MGK2UOQTDDZEZQPOWUIKDKY7W`
**Source**: `contracts/sponsor-pool/` (lib.rs, pool.rs, math.rs, types.rs)
**Status**: audit baseline (B1)

---

## 1. Purpose

SponsorPool is a micro-sponsorship vault on Stellar Soroban. Supporters deposit USDC into a pool created by a creator. If the goal is met and supporters approve the submitted work, the creator receives the pool minus a platform fee. Otherwise, supporters receive pro-rata refunds. Disputes are resolved by community arbitration. A referral program rewards referrers. An admin (deployer) can configure fees, treasury, pause the contract, and transfer admin.

---

## 2. State Machine

### 2.1 Pool statuses

| Value | Name | Meaning |
|---|---|---|
| 0 | OPEN | Accepting deposits |
| 1 | AWAITING_VOTE | Work submitted; supporters voting |
| 2 | PAID | Creator paid (goal met + work approved or dispute won) |
| 3 | EXPIRED | Refunded (goal unmet, rejected, cancelled, or dispute lost) |
| 4 | DISPUTED | Dispute raised |
| 5 | APPEALED | Dispute appealed (status 3 internally) |

### 2.2 Legal transitions

```
OPEN ──deposit──────────────────────────────▶ OPEN
OPEN ──deadline passes + finalize──────────▶ EXPIRED
OPEN ──submit_work─────────────────────────▶ AWAITING_VOTE
OPEN ──cancel_pool (creator)───────────────▶ EXPIRED
AWAITING_VOTE ──vote───────────────────────▶ AWAITING_VOTE
AWAITING_VOTE ──finalize (approve)─────────▶ PAID
AWAITING_VOTE ──finalize (reject)──────────▶ EXPIRED
AWAITING_VOTE ──raise_dispute──────────────▶ DISPUTED
EXPIRED ──raise_dispute (allowed)──────────▶ DISPUTED
DISPUTED ──close_dispute (creator wins)────▶ PAID
DISPUTED ──close_dispute (supporters win)──▶ EXPIRED
DISPUTED ──appeal_dispute──────────────────▶ APPEALED
APPEALED ──resolve_dispute (votes)─────────▶ APPEALED
APPEALED ──close_dispute───────────────────▶ PAID | EXPIRED
PAID / EXPIRED ──(terminal)────────────────▶ (no further transitions)
```

**Illegal transitions (must revert)**: deposit on non-OPEN; submit_work on non-OPEN; vote on non-AWAITING_VOTE; finalize on PAID/EXPIRED (double-finalize); cancel on non-OPEN or after work; raise_dispute on PAID.

### 2.3 Dispute statuses

| Value | Name |
|---|---|
| 0 | OPEN (voting) |
| 1 | RESOLVED_FOR_CREATOR |
| 2 | RESOLVED_FOR_SUPPORTERS |
| 3 | APPEALED (re-voting; status 0/3 allowed for votes) |

---

## 3. Storage Map

### 3.1 Instance storage (config — capped, constant size)

| Key | Type | Written by |
|---|---|---|
| `Admin` | Address | initialize, accept_admin |
| `PendingAdmin` | Address | propose_admin (removed on accept) |
| `Paused` | bool | pause, unpause |
| `PauseNoticeAt` | u64 | schedule_pause |
| `PausedAt` | u64 | pause |
| `FeeBps` | i128 | set_fee |
| `FeeTreasury` | Address | set_fee, set_fee_treasury |
| `FeeTotal` | i128 | finalize, close_dispute, withdraw_fees |
| `PoolCount` | u32 | create |
| `DisputeCount` | u32 | raise_dispute |
| `FlowVoteDeadline` | u64 | set_flow_constants (default 604800) |
| `FlowPauseNotice` | u64 | set_flow_constants (default 86400) |
| `FlowUnpauseCooldown` | u64 | set_flow_constants (default 172800) |

### 3.2 Persistent storage (per-record, TTL-managed, 31 days)

| Key family | Type | Written by | TTL refreshed |
|---|---|---|---|
| `Pool(id)` | Pool | create, submit_work, vote, finalize, cancel_pool, close_dispute | set_pool |
| `Supporter(pool, addr)` | Supporter | deposit, vote | set_supporter |
| `SupporterList(pool)` | Vec<Snapshot> | deposit | push_supporter_list |
| `Dispute(id)` | Dispute | raise_dispute, close_dispute, appeal_dispute | per-set |
| `ArbitratorVote(dispute, addr)` | ArbitratorVote | resolve_dispute | per-set |
| `ArbitratorVoteList(dispute)` | Vec<Vote> | resolve_dispute | per-set |
| `Referral(addr)` | Vec<Referral> | register_referral, finalize, claim | per-set |

**Invariant S1**: every persistent write is followed by `extend_ttl(threshold=now+535680, extend=now+535680)` — verified 11/11 sites.

---

## 4. Entry Points — 37 (pre/post conditions)

### 4.1 Admin & governance (9)

| # | Function | Auth | Pre | Post |
|---|---|---|---|---|
| 1 | `initialize(caller, admin)` | caller auth | Admin not set | Admin = admin |
| 2 | `get_admin()` | — | — | returns Admin |
| 3 | `propose_admin(caller, new)` | caller == Admin | new != caller | PendingAdmin = new; event `p_admp` |
| 4 | `accept_admin(caller)` | caller auth | PendingAdmin exists AND caller == PendingAdmin | Admin = caller; PendingAdmin removed; event `p_adma` |
| 5 | `schedule_pause(caller)` | caller == Admin | not paused | PauseNoticeAt = now + notice |
| 6 | `pause(caller)` | caller == Admin | PauseNoticeAt != 0 AND now ≥ PauseNoticeAt | Paused = true; PausedAt = now; event `p_paed` |
| 7 | `unpause(caller)` | caller == Admin | PausedAt != 0 AND now ≥ PausedAt + cooldown | Paused = false; event `p_unps` |
| 8 | `get_paused()` | — | — | returns Paused |
| 9 | `set_flow_constants(caller, v, n, c)` | caller == Admin | all in [60, 31536000] | Flow* updated |

### 4.2 Fees & treasury (6)

| # | Function | Auth | Pre | Post |
|---|---|---|---|---|
| 10 | `set_fee(caller, bps, treasury)` | caller == Admin | bps ≤ 500 | FeeBps/Treasury set; event `p_feeu` |
| 11 | `set_fee_treasury(caller, t)` | caller == Admin | — | FeeTreasury = t; event `p_feet` |
| 12 | `withdraw_fees(caller, amt)` | caller == Admin | amt > 0 AND amt ≤ FeeTotal AND FeeTreasury set | FeeTotal −= amt; event `p_fees` |
| 13 | `get_fee()` | — | — | (bps, treasury) |
| 14 | `get_total_fees_collected()` | — | — | FeeTotal |
| 15 | `get_platform_stats()` | — | — | PlatformStats (O(n)) |

### 4.3 Pool lifecycle (8)

| # | Function | Auth | Pre | Post |
|---|---|---|---|---|
| 16 | `create(creator, goal, deadline, token, meta)` | creator auth | goal > 0; deadline > now; meta non-empty; not paused | Pool(id) OPEN; PoolCount++; event `p_creat`; returns id |
| 17 | `deposit(pool, supporter, amt)` | supporter auth | pool OPEN; now < deadline; amt > 0; not paused | balance transfer to contract; Supporter += amt; if new → SupporterList append; total_deposited += amt; events `p_dep` (+ `p_goal` if reached) |
| 18 | `submit_work(pool, hash)` | pool.creator auth | pool OPEN; not submitted; hash non-empty; now < deadline; supporters ≥ 1; not paused | Pool → AWAITING_VOTE; work_hash set; vote_deadline = now + FlowVoteDeadline; event `p_work` |
| 19 | `vote(pool, voter, approve)` | voter auth | pool AWAITING_VOTE; now < vote_deadline; voter is supporter with amount > 0; not voted; not paused | yes/no += amount; Supporter.voted = true; event `p_vote` |
| 20 | `finalize(pool)` | permissionless | not PAID/EXPIRED; if AWAITING_VOTE then now ≥ vote_deadline OR now ≥ pool.deadline; not paused | See §5 settlement |
| 21 | `cancel_pool(caller, pool)` | caller == creator | pool OPEN; now < deadline; work not submitted; not paused | Pool → EXPIRED; pro-rata refunds; event `p_cancl` |
| 22 | `get_pool(id)` | — | — | Option<Pool> |
| 23 | `get_pool_count()` | — | — | PoolCount |

### 4.4 Disputes (7)

| # | Function | Auth | Pre | Post |
|---|---|---|---|---|
| 24 | `raise_dispute(pool, disputant, reason, evidence)` | disputant auth | pool AWAITING_VOTE or EXPIRED; no dispute on pool; evidence non-empty; not paused | 1% goal fee transferred to contract; Dispute(id) OPEN; pool → DISPUTED; event `p_disp` |
| 25 | `resolve_dispute(pool, caller, did, for_creator, reason)` | caller auth | dispute status 0 or 3; pool DISPUTED or APPEALED; caller not already voted; not paused | ArbitratorVote added; weight = 1; events `p_arbv` |
| 26 | `close_dispute(pool, did)` | permissionless | dispute status 0 or 3; not paused | Tally: creator wins iff for > against (tie → supporters); payout/refund per §5; fee returned to winner; dispute status 1/2; events `p_resl` |
| 27 | `appeal_dispute(pool, disputant, did)` | disputant auth | dispute 0 or 3; appeal_count < 2; not paused | doubled fee transferred; appeal_count++; dispute → 3; pool → APPEALED |
| 28 | `get_dispute(id)` | — | — | Option<Dispute> |
| 29 | `get_arbitrator_votes(did)` | — | — | Vec<ArbitratorVote> |

### 4.5 Referrals (3)

| # | Function | Auth | Pre | Post |
|---|---|---|---|---|
| 30 | `register_referral(referrer, referee, pool)` | referrer auth | referrer != referee; not paused | Referral appended (dedupe by referee+pool); event `p_refr` |
| 31 | `claim_referral_reward(referrer)` | referrer auth | not paused | transfers Σ unclaimed rewards (0.5% of each referee contribution); marks claimed |
| 32 | `get_referrals(referrer)` | — | — | Vec<Referral> |

### 4.6 Views (5)

| # | Function | Notes |
|---|---|---|
| 33 | `get_supporter(pool, addr)` | Option<Supporter> |
| 34 | `get_pools_by_creator(creator)` | O(n) scan |
| 35 | `get_pools_by_supporter(supporter)` | O(n) scan |
| 36 | `get_contract_version()` | returns 3 |
| 37 | `get_flow_constants()` | (vote, notice, cooldown) |

---

## 5. Settlement Logic (finalize / close_dispute / cancel_pool)

### 5.1 Payout branch (goal met AND work submitted AND approved)
```
fee = floor(total_deposited * FeeBps / 10000)     [FeeBps=0 → fee=0]
payout = total_deposited − fee
transfer(contract → creator, payout)
if fee > 0: transfer(contract → FeeTreasury, fee); FeeTotal += fee
for each Referral(referrer=creator) where referee deposited:
    reward = floor(referee.amount * 50 / 10000)   [0.5%]
    credit Referral.reward
pool → PAID
```

### 5.2 Refund branch (goal unmet / rejected / cancelled / dispute lost)
```
for each supporter in SupporterList(pool):
    transfer(contract → supporter, amount)        [try_transfer; failures skipped]
pool → EXPIRED
```

### 5.3 Dispute resolution
```
for, against = tally(ArbitratorVoteList(did))
creator_wins = for > against                    [tie/zero → supporters win]
if creator_wins: apply §5.1 (payout + fee to treasury)
else: apply §5.2 (refunds)
dispute.fee returned to winner                 [fee = 1% goal + Σ appeal doublings]
dispute.resolved_at = now
```

---

## 6. Invariants (asserted by tests + fuzz)

| # | Invariant |
|---|---|
| I1 | `supporter amounts sum == pool.total_deposited` (per pool) |
| I2 | `yes_votes + no_votes ≤ total_deposited` (weights ≤ contributions) |
| I3 | `creator_payout + fee == total_deposited` (fee settlement preserves total) |
| I4 | `sum(pro-rata refunds) ≤ contract USDC balance` (no overdraw) |
| I5 | Pool status ∈ {0..5} and transitions per §2.2 |
| I6 | `referral_reward ≤ 0.5% × contribution` |
| I7 | `dispute_fee == 1% of goal`; `appeal_count ≤ 2` |
| I8 | `FeeTotal == Σ fees collected − Σ withdrawn` |
| I9 | No state mutation on revert (storage written only after all guards) |
| I10 | `Paused == true` ⇒ all write fns revert `ContractPaused` (#34) |

---

## 7. Threat Model (STRIDE)

| Threat | Vectors | Mitigation |
|---|---|---|
| **Spoofing** | Non-admin calls set_fee/withdraw/pause | stored Admin check + require_auth (verified live #32) |
| **Tampering** | Vote double-counting; referral self-registration; duplicate dispute | per-key dedupe; referrer != referee; Dispute(pool) exists check |
| **Repudiation** | State change without event | every mutation emits event (audit pass) |
| **Info disclosure** | View fns leak others' positions | by-design public chain data |
| **DoS** | Storage growth (instance cap) | per-record keys on persistent storage (live-verified fix) |
| **Elevation** | Arbitrator vote weight inflation | fixed weight = 1 (documented; production should derive from stake) |
| **Economic** | Fee redirect (treasury swap) | set_fee/set_fee_treasury admin-only; withdraw bounded by FeeTotal |
| **Economic** | Free-option on finalize (MEV-ish timing) | permissionless finalize is intended; deadlines bound it |

**Accepted risks (documented)**:
- Arbitrator weight fixed at 1 (not stake-derived) — revisit for mainnet
- `close_dispute` tie → supporters (documented; matches spec §5.3)
- Errors #11 (WorkAlreadySubmitted) and #31 (FeeTreasuryNotSet) unreachable by construction — kept for semantic completeness

---

## 8. Versioning & Upgrade

- `get_contract_version()` returns 3
- Contract deployed at `CBFW4U4HO6Z6RPRRNPWA2MWPRXJSSR2MGK2UOQTDDZEZQPOWUIKDKY7W` (audit baseline)
- Any code change bumps version + requires re-run: 44/44 unit tests, 49/49 live suites, this audit
