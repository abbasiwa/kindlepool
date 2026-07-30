export interface SybilCheckResult {
  passed: boolean
  score: number
  flags: string[]
  details: string
}

export function checkAccountAge(createdAt: number, minAgeMs: number = 7 * 24 * 60 * 60 * 1000): SybilCheckResult {
  const now = Date.now()
  if (createdAt <= 0 || createdAt > now) {
    return { passed: false, score: 0, flags: ['invalid_account_date'], details: 'Account creation date is invalid.' }
  }
  const age = now - createdAt
  if (age < minAgeMs) {
    return {
      passed: false, score: 0, flags: ['account_too_new'],
      details: `Account is ${Math.floor(age / 86400000)} days old. Minimum: ${Math.floor(minAgeMs / 86400000)} days.`,
    }
  }
  return {
    passed: true, score: 100, flags: [],
    details: `Account age OK: ${Math.floor(age / 86400000)} days.`,
  }
}

export function analyzeDepositPatterns(
  supporters: { address: string; amount: number }[],
  goal: number,
): SybilCheckResult {
  const flags: string[] = []
  let score = 100

  if (goal <= 0) {
    return { passed: true, score: 100, flags: [], details: 'No goal set — skipping pattern analysis.' }
  }

  for (const s of supporters) {
    if (s.amount > goal * 0.8) {
      flags.push('single_wallet_dominance')
      score -= 30
    }
  }

  if (supporters.length <= 1) {
    flags.push('too_few_supporters')
    score -= 20
  }

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
