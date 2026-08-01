# KindlePool SponsorPool — Local Professional Audit Report (B1.3)

**Auditor**: mikwansa (internal, senior-engineer level) · **Date**: 2026-08-01 · **Version**: 1.0
**Target**: `contracts/sponsor-pool` (CONTRACT_VERSION 3) + Phase-2 services (indexer/relayer/notifier/monitor)
**Method**: B1.2 ten-pass systematic review (P1–P10) against `docs/SPEC.md`, `docs/known-issues.md`, `docs/coverage-report.md`

---

## 1. Scope & baseline

| Artifact | Baseline | Status |
|---|---|---|
| Contract unit+proptest | 74/74 unit + 3k+ proptest cases | ✅ green |
| Live testnet integration | 15/15 suites, 49/49 checks (fresh contract) | ✅ green |
| Coverage | pool.rs 95.45% lines / 100% fns; TOTAL 96.36% | ✅ ≥90% gate |
| Spec | docs/SPEC.md (7 statuses, 37 entry points, 10 invariants) | ✅ matches code |
| Known-issues ledger | 16 contract + 6 infra | ✅ closed/pending per ledger |

## 2. Pass summary (B1.2)

| Pass | Scope | Result |
|---|---|---|
| P1 Auth | 21 require_auth sites + require_admin, per-entry-point | 5 findings (2 Medium, 2 Low, 1 Info) |
| P2 Storage/state | 22 DataKey variants, instance vs persistent, TTL | 3 findings (1 Medium, 2 Info) |
| P3 Arithmetic | all operators + math.rs | 2 findings (1 Medium, 1 Info) |
| P4 Reentrancy | token transfers, ordering, atomicity | 2 findings (1 **High**, 1 Info) |
| P5 Timelock | flow constants, pause/unpause, deadlines | 3 findings (1 **High**, 2 Info) |
| P6 Events | 20 topics vs SPEC p_* | 1 finding (Medium) |
| P7 Indexer | listener/db/api | 5 findings (1 **High**, 3 Medium, 1 Info) |
| P8 Relayer | relay endpoint | 4 findings (1 **High**, 2 Medium, 1 Info) |
| P9 Notifier | subscribe/notify | 2 findings (1 Medium, 1 Info) |
| P10 Monitor | checks/alerts | 3 findings (1 Medium, 1 Low, 1 Info) |

**Total: 30 findings — 4 High, 9 Medium, 4 Low, 13 Info.**

## 3. Finding register

Legend: 🔴 High · 🟠 Medium · 🟡 Low · ⚪ Info · ✅ verified-clean (counted separately, not listed)

### P1 — Auth

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-101 | 🟠 | **Creator self-approval**: `deposit` does not exclude the creator; `vote` does not exclude the creator. A creator can deposit above supporters' total and vote `approve` with full stake, making `yes_votes > no_votes` and collecting all deposits (incl. supporters') minus fee. | pool.rs:343 (deposit), pool.rs:482-501 (vote weight = supporter amount); SPEC §5.2 sanctions this (no creator exclusion) | **FIX recommended**: exclude creator stake from tally or require quorum. Spec-compliant → classify accepted for MVP **only if documented + mainnet fix scheduled** |
| F-102 | ⚪ | `init_admin` double-init returns `#14 AlreadyFinalized` — misleading code for "already initialized" | pool.rs:81-83 | Waive (documented, tested) |
| F-103 | ⚪ | Error-code reuse: propose_admin self → `#3 InvalidGoal`; accept_admin mismatch → `#33 CallerIsNotPendingAdmin` | pool.rs:94-113 | Waive (consistent with KI-010 policy) |
| F-104 | 🟡 | `register_referral` accepts arbitrary `pool_id` (no existence check) and arbitrary referee; unauthenticated reference to non-existent pools pollutes storage; refund-path spam | pool.rs:991-1015 | **Waive (Low)** — storage spam costs the spammer gas; no fund risk. Optionally add pool-exists check |
| F-105 | 🟠 | **Referral self-credit**: finalize credits rewards from `DataKey::Referral(pool.creator)` for every supporter matched to a pre-registered referee list; creator can pre-register all supporters and self-credit up to 5% of deposits as "bonus" post-payout (balance-bounded by contract balance after fee) | pool.rs:563-581 (credit loop), pool.rs:1017-1047 (claim via try_transfer) | **FIX recommended**: exclude creator-as-referrer in credit loop; cap total rewards ≤ FeeTotal; add regression test |

### P2 — Storage/state

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-201 | 🟠 | **TTL only on write**: Pool/Supporter/Dispute/Vote/Referral records get `extend_ttl` on write (11 sites) but never on read. `set_flow_constants` allows vote_deadline up to MAX_FLOW_CONSTANT (365 d) while records expire ~31 d. A pool inactive >31 d → archived records → `PoolNotFound` → **funds stuck in contract** | pool.rs:224-274 (TTL on set only); pool.rs:7-36 (365-d bound) | **FIX recommended**: extend TTL on read paths (`get_pool_internal`); cap flow constants ≤ TTL horizon; regression test with `env.ledger().set_sequence` |
| F-202 | ⚪ | `DataKey::ReferralRewards(Address)` declared, never used (dead key) | types.rs:234 | Waive (harmless; remove on next release) |
| F-203 | ⚪ | `get_platform_stats`/`get_pools_by_*` iterate 1..=count — O(n) per view; gas-DoS at scale (view-only) | pool.rs:1095-1123 | Waive (view-only; document limit) |

### P3 — Arithmetic

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-301 | 🟠 | **math.rs not used by contract**: proptests (98.78% coverage) target `math.rs` functions which `pool.rs` never calls; on-chain inline math (checked_mul + /10000) is covered only by unit tests | grep: no `math::` use in pool.rs; pool.rs:542-548, 831-835, 573 | **FIX recommended**: route pool.rs through `math::` fns (or mirror proptests on inline logic) so fuzz guarantees reach on-chain arithmetic |
| F-302 | ⚪ | Fee/referral rounding truncates toward zero (floor) — deterministic, documented | math.rs:16-21, pool.rs:573 | Waive (invariant I3 holds: payout + fee = total) |

### P4 — Reentrancy

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-401 | 🔴 | **`withdraw_fees` performs no token transfer**: decrements `FeeTotal`, emits event, but never moves funds to treasury. Treasury never receives collected fees; FeeTotal bookkeeping diverges from contract balance permanently | pool.rs:196-215 (no token client at all); no positive-path test exists. **Empirically proven**: scratch test — treasury balance unchanged after `withdraw_fees(fee_total)` | **FIX (High, must-fix before mainnet)**: add `token.transfer(contract → treasury, amount)`; regression test asserting treasury balance |
| F-402 | ⚪ | finalize fee→treasury uses hard `transfer` — if treasury can't receive, finalize reverts (no try_transfer). Treasury is admin-set; acceptable | pool.rs:555-557 | Waive (documented; treasury is trusted admin config) |

### P5 — Timelock

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-501 | 🔴 | **`finalize` does not block DISPUTED/APPEALED pools**: guards only PAID/EXPIRED (L520) and early AWAITING_VOTE (L526). During an open dispute anyone can finalize using stale yes/no votes; if `goal_met && work_submitted && approved` → creator paid while arbitration is pending; a later supporters-win `close_dispute` then refunds from an emptied contract (try_transfer silently fails) | pool.rs:516-631 (no STATUS_DISPUTED/APPEALED check); no test covers finalize-on-dispute. **Empirically proven**: scratch test — yes-vote → raise dispute → finalize → pool PAID, creator +99M, dispute.status still 0 | **FIX (High, must-fix)**: reject finalize when status is DISPUTED/APPEALED; regression test |
| F-502 | ⚪ | `schedule_pause` repeatable (push notice out); no cancel — admin-only, no harm | pool.rs:124-133 | Waive |
| F-503 | ⚪ | Early finalize at `pool.deadline` even inside the vote window (vote_deadline > deadline) → settlement with partial votes; zero-vote case refunds safely | SPEC §20 documents this | Waive (spec-sanctioned; refund-safe) |

### P6 — Events

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-601 | 🟠 | **`appeal_dispute` emits no event**: DISPUTED→APPEALED transition + doubled fee invisible to indexer/notifier/monitor; 19/20 transitions have events | pool.rs:915-965 (no publish call) | **FIX recommended**: add `TOPIC_DISPUTE_APPEALED`; indexer handler |

### P7 — Indexer

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-701 | 🔴 | **Event payload parsing unverified/fragile**: RPC returns scval JSON (`{"u64":…}`, `{"symbol":…}`), code treats topics as plain strings; `parseInt(t(4))`/`parseInt(topics[1])` on objects → NaN → events silently dropped. Never exercised by A3 (which invoked contract directly, not the indexer pipeline) | listener.ts:24-39 | **FIX (High)**: decode scvals (env parsing via soroban-client or `scval` util); add integration test with real event JSON fixtures |
| F-702 | 🟠 | **total_supporters overcount**: `p_dep` increments `total_supporters + 1` on every deposit event incl. repeat deposits by same supporter | listener.ts:59-70 | **FIX recommended**: count only first deposit (query supporters before upsert) |
| F-703 | 🟠 | **Only 7/20 topics handled**: disputes (p_dres), arbitration votes, cancel, pause, fee, referral events ignored → pools stay `awaiting_vote` forever after dispute; monitors can't see disputes | listener.ts:12-20 (EVENT_KEYS) | **FIX recommended**: add p_dres/p_arbv/p_cancel/p_pause handlers; status sync |
| F-704 | 🟠 | `lastLedger` in-memory: restart re-indexes trailing 100 ledgers → duplicate events (compounds F-702 double count); downtime >100 ledgers → silent gaps | listener.ts:9,140-162 | **FIX recommended**: persist cursor (e.g., checkpoint table) |
| F-705 | 🟡 | `pools.id` = contract pool_id (AUTOINCREMENT + explicit id) — multi-contract indexing collides on PRIMARY KEY → insert crash, event skipped | db.ts:28-45, listener.ts:43 | Waive for single-contract MVP; document for multi-contract |

### P8 — Relayer

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-801 | 🔴 | **Relayer never submits the user's transaction**: decodes `tx_xdr`, then discards it and submits its own fee-bearing `manageData` tx; the user's signed contract invocation never reaches the network. Relay is functionally broken (KI-105 note was cosmetic) | relayer/src/index.ts:44-74 | **FIX (High)**: submit the user's decoded envelope (sponsored/fee-bumped), or rebuild + sign the contract call server-side with explicit intent |
| F-802 | 🟠 | No auth/allowlist on `/relay` — anyone can trigger relayer-funded txs (spam); only rate-limit (50/min) mitigates | index.ts:23-28,35 | **FIX recommended**: allowlist or signature check; fee budget per account |
| F-803 | 🟠 | `source_address` unvalidated (not an account check, no ownership proof) — used only for manageData memo; no verification the envelope belongs to it | index.ts:37-70 | FIX recommended (part of F-801 rework) |
| F-804 | ⚪ | `fee = '100000'` hardcoded; timebounds 300 s; no fee-bump/sponsorship — fee economics unchecked | index.ts:60-65 | Waive for MVP; revisit with F-801 |

### P9 — Notifier

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-901 | 🟠 | **subscribe/notify unauthenticated**: anyone can subscribe a victim's address with attacker email → victim's notifications leak; `/notify` is a public subscription oracle; no rate limit → spam | notifier/src/index.ts:16-72 | **FIX recommended**: require proof of address ownership (signed challenge) or auth key; rate limit |
| F-902 | ⚪ | In-memory subscriptions lost on restart (KI-101 class — API keys) | index.ts:11 | Waive (pending DB-backed store; ledger tracked) |

### P10 — Monitor

| ID | Sev | Finding | Evidence | Disposition |
|---|---|---|---|---|
| F-1001 | 🟠 | Health/anomaly history in-memory; persisted only on SIGINT (crash loses data) | monitor/src/index.ts:33-35,117-120,134-138 | FIX recommended (persist each tick) |
| F-1002 | 🟡 | Anomaly detection shallow (rpc_down, indexer_down, pool-count spike); no contract-level checks (stuck disputes, refund failures, pause state) | index.ts:93-116 | Waive for MVP; roadmap item |
| F-1003 | ⚪ | Alert webhook fire-and-forget (`.catch(()=>{})`), no retry (KI-104) | index.ts:45-54 | Waive (ledger tracked, pending) |

## 4. Must-fix summary (pre-mainnet)

| # | Finding | Impact | Fix size |
|---|---|---|---|
| 1 | F-401 withdraw_fees no transfer | Treasury never paid; stranded fees | Small (contract) |
| 2 | F-501 finalize during dispute | Settlement bypasses arbitration | Small (contract) |
| 3 | F-801 relayer never relays | Core relayer feature broken | Medium (service) |
| 4 | F-701 indexer event parsing | Indexer data silently wrong/empty | Medium (service) |

Recommended contract fixes also include F-201 (TTL on read), F-105 (referral self-credit), F-601 (appeal event), F-301 (math.rs wiring), F-101 (creator vote exclusion) — each with regression tests, per user severity policy (fix Medium+, waive Low/Info with justification above).

## 5. Sign-off

- [x] Ten passes executed (P1–P10) against current HEAD.
- [x] All 30 findings evidenced with file:line and disposition.
- [x] KI ledger updated references: F-201↔KI-002/013, F-105↔KI-015/016, F-902↔KI-101, F-1003↔KI-104.
- [ ] Contract fixes (F-401, F-501, F-201, F-105, F-601, F-301, F-101) — pending user decision.
- [ ] Re-run A3 live suite + coverage after fixes.
- [ ] B2 RFQ to reference this report as "internal audit v1".

**Engineer**: mikwansa
**Status**: DRAFT — findings F-401 & F-501 empirically proven; pending fix batch + re-audit signature
