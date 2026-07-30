import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface WalletContextType {
  address: string | null
  connected: boolean
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signAndSubmit: (xdr: string) => Promise<string | null>
  network: string
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  signAndSubmit: async () => null,
  network: 'testnet',
})

async function getFreighterAddress(): Promise<string | null> {
  try {
    const { getAddress } = await import('@stellar/freighter-api')
    const res = await getAddress()
    return res?.address ?? null
  } catch {
    return null
  }
}

async function connectFreighter(): Promise<string | null> {
  try {
    const { isConnected, getAddress } = await import('@stellar/freighter-api')
    const connected = await isConnected()
    if (!connected) {
      const { requestAccess } = await import('@stellar/freighter-api')
      const res = await requestAccess()
      return res?.address ?? null
    }
    const res = await getAddress()
    return res?.address ?? null
  } catch {
    return null
  }
}

async function freighterSignAndSubmit(xdr: string): Promise<string | null> {
  try {
    const { signTransaction } = await import('@stellar/freighter-api')
    const res = await signTransaction(xdr, { networkPassphrase: 'Test SDF Network ; September 2015' })
    return (res as any)?.signedTxXdr ?? null
  } catch {
    return null
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    getFreighterAddress().then(setAddress)
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const addr = await connectFreighter()
      if (addr) setAddress(addr)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  const signAndSubmit = useCallback(async (xdr: string): Promise<string | null> => {
    return await freighterSignAndSubmit(xdr)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        connect,
        disconnect,
        signAndSubmit,
        network: 'testnet',
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
