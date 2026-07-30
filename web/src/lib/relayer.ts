export interface RelayResult {
  success: boolean
  hash?: string
  error?: string
}

export interface RelayerHealth {
  status: 'ok' | 'degraded' | 'unreachable'
  relayer_address?: string
  balance?: string
}

const DEFAULT_RELAYER_URL = 'http://localhost:3002'

function getRelayerUrl(): string {
  if (typeof window !== 'undefined' && (window as any).KINDPOOL_RELAYER_URL) {
    return (window as any).KINDPOOL_RELAYER_URL
  }
  return DEFAULT_RELAYER_URL
}

export async function relayTransaction(txXdr: string, sourceAddress: string): Promise<RelayResult> {
  try {
    const res = await fetch(`${getRelayerUrl()}/api/v1/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_xdr: txXdr, source_address: sourceAddress }),
    })
    return await res.json()
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Relay request failed' }
  }
}

export async function getRelayerHealth(): Promise<RelayerHealth> {
  try {
    const res = await fetch(`${getRelayerUrl()}/api/v1/health`)
    return await res.json()
  } catch {
    return { status: 'unreachable' }
  }
}
