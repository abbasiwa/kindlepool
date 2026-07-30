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
  } catch { return null }
}

async function connectFreighter(): Promise<string | null> {
  try {
    const { isConnected, getAddress, requestAccess } = await import('@stellar/freighter-api')
    const connected = await isConnected()
    if (!connected) {
      const res = await requestAccess()
      return res?.address ?? null
    }
    const res = await getAddress()
    return res?.address ?? null
  } catch { return null }
}

async function freighterSignAndSubmit(xdr: string, network: string): Promise<string | null> {
  try {
    const { signTransaction } = await import('@stellar/freighter-api')
    const res = await signTransaction(xdr, { networkPassphrase: network })
    return (res as any)?.signedTxXdr ?? null
  } catch { return null }
}

async function getFreighterNetwork(): Promise<string> {
  try {
    const { getNetworkDetails } = await import('@stellar/freighter-api')
    const details = await getNetworkDetails()
    return details?.networkPassphrase ?? 'Test SDF Network ; September 2015'
  } catch { return 'Test SDF Network ; September 2015' }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [network, setNetwork] = useState('Test SDF Network ; September 2015')

  useEffect(() => {
    (async () => {
      const [addr, net] = await Promise.all([getFreighterAddress(), getFreighterNetwork()])
      if (addr) setAddress(addr)
      setNetwork(net)
    })()
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const addr = await connectFreighter()
      if (addr) setAddress(addr)
      const net = await getFreighterNetwork()
      setNetwork(net)
    } finally { setConnecting(false) }
  }, [])

  const disconnect = useCallback(() => { setAddress(null) }, [])

  const signAndSubmit = useCallback(async (xdr: string): Promise<string | null> => {
    return await freighterSignAndSubmit(xdr, network)
  }, [network])

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        connecting,
        connect,
        disconnect,
        signAndSubmit,
        network,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
