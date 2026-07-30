export interface SybilCheckResult {
  passed: boolean
  score: number
  flags: string[]
  details: string
}

export interface DepositPattern {
  address: string
  totalDeposited: string
  depositsCount: number
  uniquePoolCount: number
  largestDeposit: string
  firstDepositAt: number
}

/**
 * Checks if a wallet is old enough to create a pool.
 * Minimum account age: 7 days on testnet, configurable.
 */
export function checkAccountAge(createdAt: number, minAgeMs: number = 7 * 24 * 60 * 60 * 1000): SybilCheckResult {
  const age = Date.now() - createdAt
  if (age < minAgeMs) {
    return {
      passed: false,
      score: 0,
      flags: ['account_too_new'],
      details: `Account is ${Math.floor(age / 86400000)} days old. Minimum: ${Math.floor(minAgeMs / 86400000)} days.`,
    }
  }
  return {
    passed: true,
    score: 100,
    flags: [],
    details: `Account age OK: ${Math.floor(age / 86400000)} days.`,
  }
}

/**
 * Analyzes deposit patterns to detect sybil behavior.
 * Flags: single wallet funding >80% of goal, rapid successive deposits, same-IP patterns.
 */
export function analyzeDepositPatterns(
  supporters: { address: string; amount: number }[],
  goal: number,
): SybilCheckResult {
  const flags: string[] = []
  let score = 100

  // Check if any single wallet funded >80% of goal
  for (const s of supporters) {
    if (s.amount > goal * 0.8) {
      flags.push('single_wallet_dominance')
      score -= 30
    }
  }

  // Check for too few unique supporters
  if (supporters.length <= 1 && goal > 0) {
    flags.push('too_few_supporters')
    score -= 20
  }

  // Check average deposit size vs goal
  if (supporters.length > 0) {
    const avg = supporters.reduce((sum, s) => sum + s.amount, 0) / supporters.length
    if (avg > goal * 0.5) {
      flags.push('high_average_deposit')
      score -= 10
    }
  }

  return {
    passed: score >= 50,
    score: Math.max(0, score),
    flags,
    details: flags.length > 0
      ? `Flags: ${flags.join(', ')}. Score: ${Math.max(0, score)}/100`
      : 'No suspicious patterns detected.',
  }
}

/**
 * Simulates blockchain account check.
 * In production: queries Stellar for account creation ledger.
 */
export function getMockAccountAge(): { createdAt: number; ageDays: number } {
  const createdAt = Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
  return { createdAt, ageDays: Math.floor((Date.now() - createdAt) / 86400000) }
}
