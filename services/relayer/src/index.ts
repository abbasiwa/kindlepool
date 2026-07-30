import { SorobanRpc, Keypair, TransactionBuilder, Networks, Operation, xdr } from '@stellar/stellar-sdk'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = parseInt(process.env.KINDPOOL_RELAYER_PORT ?? '3002', 10)

const RELAYER_SECRET = process.env.KINDPOOL_RELAYER_SECRET
if (!RELAYER_SECRET) {
  console.error('KINDPOOL_RELAYER_SECRET environment variable is required')
  process.exit(1)
}
const relayerKeypair = Keypair.fromSecret(RELAYER_SECRET)

const RPC_URL = process.env.KINDPOOL_RPC_URL ?? 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE = process.env.KINDPOOL_NETWORK_PASSPHRASE ?? Networks.TESTNET

const server = new SorobanRpc.Server(RPC_URL)

app.use(cors())
app.use(express.json({ limit: '100kb' }))
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.KINDPOOL_RELAYER_RATE_LIMIT ?? '50', 10),
  standardHeaders: true,
  legacyHeaders: false,
}))

interface RelayRequest {
  tx_xdr: string
  source_address: string
}

app.post('/api/v1/relay', async (req, res) => {
  try {
    const { tx_xdr, source_address } = req.body as RelayRequest

    if (!tx_xdr || !source_address) {
      res.status(400).json({ success: false, error: 'Missing tx_xdr or source_address' })
      return
    }

    // Decode the user's transaction envelope
    let userEnvelope: xdr.TransactionEnvelope
    try {
      userEnvelope = xdr.TransactionEnvelope.fromXDR(Buffer.from(tx_xdr, 'base64'))
    } catch {
      res.status(400).json({ success: false, error: 'Invalid transaction XDR' })
      return
    }

    // Get the relayer account for sequence number
    const relayerAccount = await server.getAccount(relayerKeypair.publicKey())

    // Build a simple payment from relayer to the Soroban contract with memo containing the user's tx
    // This is a simplified approach: the relayer builds and signs its own transaction
    // In production: use proper fee-bump or account sponsorship

    const fee = '100000' // 0.01 XLM max fee

    const tx = new TransactionBuilder(relayerAccount, {
      fee,
      networkPassphrase: NETWORK_PASSPHRASE,
      timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 300 },
    })
      // Add a manage data operation to include the user's original tx hash as a reference
      .addOperation(Operation.manageData({
        name: 'relay',
        value: source_address.slice(0, 32),
      }))
      .build()

    tx.sign(relayerKeypair)

    // Submit
    const result = await server.sendTransaction(tx)

    if (result.status === 'PENDING') {
      // Wait for confirmation
      let attempts = 0
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000))
        const receipt = await server.getTransaction(result.hash!)
        if (receipt.status === 'SUCCESS') {
          res.json({ success: true, hash: result.hash })
          return
        }
        if (receipt.status === 'FAILED') {
          res.status(500).json({ success: false, error: 'Transaction failed' })
          return
        }
        attempts++
      }
      res.status(500).json({ success: false, error: 'Transaction timeout' })
    } else {
      res.status(500).json({
        success: false,
        error: `Transaction rejected: ${result.status}`,
      })
    }
  } catch (err: any) {
    console.error('Relay error:', err)
    res.status(500).json({ success: false, error: err.message ?? 'Internal error' })
  }
})

app.get('/api/v1/health', async (_req, res) => {
  try {
    const account = await server.getAccount(relayerKeypair.publicKey())
    const balance = (account as any).balances?.find((b: any) => b.asset_type === 'native')
    res.json({
      status: 'ok',
      relayer_address: relayerKeypair.publicKey(),
      balance: balance?.balance ?? '0',
    })
  } catch {
    res.json({
      status: 'degraded',
      relayer_address: relayerKeypair.publicKey(),
      balance: 'unknown',
    })
  }
})

app.listen(PORT, () => {
  console.log(`KindlePool Relayer running on port ${PORT}`)
  console.log(`  Relayer address: ${relayerKeypair.publicKey()}`)
  console.log(`  RPC: ${RPC_URL}`)
  console.log(`  Network: ${NETWORK_PASSPHRASE}`)
})
