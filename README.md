# KindlePool

**Fund the work, not the creator.**

Micro-sponsor pools for creators. Supporters fund specific work, not creators. Money pools trustlessly on Stellar Soroban, releases to the creator only if quality thresholds are met, and automatically refunds supporters if the goal fails or work is rejected.

## Architecture

```
┌─────────────────────┐
│   Soroban Contract  │ ← Core pool logic (create, deposit, submit, vote, finalize)
├─────────────────────┤
│   Indexer + API     │ ← Off-chain event processing + REST API
├─────────────────────┤
│   Web App (PWA)     │ ← React front-end with wallet integration
├─────────────────────┤
│   AI Services       │ ← Recommendations, quality pre-check, trending
└─────────────────────┘
```

## Smart Contract

The contract is in `contracts/sponsor-pool/`.

### Build

```bash
cargo build -p sponsor-pool --target wasm32-unknown-unknown --release
```

### Test

```bash
# Requires testutils feature for Soroban SDK
cargo test -p sponsor-pool --features testutils
```

### Deploy

```bash
# Install soroban-cli first
# Then:
./scripts/deploy.sh testnet
```

### Contract Functions

| Function | Description |
|---|---|
| `create(creator, goal, deadline, token, metadata_hash)` | Create a new funding pool |
| `deposit(pool_id, supporter, amount)` | Fund a pool |
| `submit_work(pool_id, work_hash)` | Creator submits work for review |
| `vote(pool_id, voter, approve)` | Token-weighted quality vote |
| `finalize(pool_id)` | Settle pool — payout or refund |
| `get_pool(pool_id)` | View pool state |

## Milestones

See [milestone.md](milestone.md) for the full development roadmap (66 sub-milestones across 12 phases).

## License

MIT
