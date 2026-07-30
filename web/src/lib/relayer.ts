const RELAYER_URL = process.env.KINDPOOL_RELAYER_URL ?? 'http://localhost:3002'

export interface RelayResult {
  success: boolean
  hash?: string
  error?: string
}

/**
 * Submits a transaction to the relayer for fee-bumping.
 * The relayer covers the XLM fee so the user doesn't need native XLM.
 */
export async function relayTransaction(txXdr: string, sourceAddress: string): Promise<RelayResult> {
  try {
    const res = await fetch(`${RELAYER_URL}/api/v1/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_xdr: txXdr, source_address: sourceAddress }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Relay request failed' }
  }
}

/**
 * Returns the relayer's health status.
 */
export async function getRelayerHealth(): Promise<any> {
  try {
    const res = await fetch(`${RELAYER_URL}/api/v1/health`)
    return await res.json()
  } catch {
    return { status: 'unreachable' }
  }
}
