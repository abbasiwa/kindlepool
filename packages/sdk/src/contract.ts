import { SorobanRpc, Contract, TransactionBuilder, Keypair, Networks, nativeToScVal, xdr } from '@stellar/stellar-sdk'
import type { CreatePoolParams, DepositParams, VoteParams } from './types'

const DEFAULT_RPC = 'https://soroban-testnet.stellar.org'
const DEFAULT_PASSPHRASE = Networks.TESTNET

export class KindlePoolContract {
  private server: SorobanRpc.Server
  private contract: Contract
  private passphrase: string

  constructor(contractId: string, options?: { rpcUrl?: string; passphrase?: string }) {
    const rpcUrl = options?.rpcUrl ?? DEFAULT_RPC
    this.server = new SorobanRpc.Server(rpcUrl)
    this.contract = new Contract(contractId)
    this.passphrase = options?.passphrase ?? DEFAULT_PASSPHRASE
  }

  async createPool(params: CreatePoolParams, source: string, signer: Keypair): Promise<string> {
    const account = await this.server.getAccount(source)
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: this.passphrase })
      .addOperation(this.contract.call('create',
        nativeToScVal(params.creator, { type: 'address' }),
        nativeToScVal(params.goal, { type: 'i128' }),
        nativeToScVal(params.deadline, { type: 'u64' }),
        nativeToScVal(params.token, { type: 'address' }),
        nativeToScVal(params.metadata_hash, { type: 'bytes' }),
      ))
      .setTimeout(300)
      .build()

    tx.sign(signer)
    const result = await this.server.sendTransaction(tx)
    if (result.status === 'PENDING') {
      const hash = result.hash!
      let attempts = 0
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000))
        const receipt = await this.server.getTransaction(hash)
        if (receipt.status === 'SUCCESS') return hash
        if (receipt.status === 'FAILED') throw new Error(`Transaction failed: ${hash}`)
        attempts++
      }
      throw new Error('Transaction timeout')
    }
    throw new Error(`Transaction rejected: ${result.status}`)
  }

  async deposit(params: DepositParams, source: string, signer: Keypair): Promise<string> {
    const account = await this.server.getAccount(source)
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: this.passphrase })
      .addOperation(this.contract.call('deposit',
        nativeToScVal(params.pool_id, { type: 'u32' }),
        nativeToScVal(params.supporter, { type: 'address' }),
        nativeToScVal(params.amount, { type: 'i128' }),
      ))
      .setTimeout(300)
      .build()

    tx.sign(signer)
    const result = await this.server.sendTransaction(tx)
    if (result.status === 'PENDING') {
      const hash = result.hash!
      let attempts = 0
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000))
        const receipt = await this.server.getTransaction(hash)
        if (receipt.status === 'SUCCESS') return hash
        if (receipt.status === 'FAILED') throw new Error(`Transaction failed: ${hash}`)
        attempts++
      }
      throw new Error('Transaction timeout')
    }
    throw new Error(`Transaction rejected: ${result.status}`)
  }

  async submitWork(poolId: number, workHash: string, source: string, signer: Keypair): Promise<string> {
    const account = await this.server.getAccount(source)
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: this.passphrase })
      .addOperation(this.contract.call('submit_work',
        nativeToScVal(poolId, { type: 'u32' }),
        nativeToScVal(workHash, { type: 'bytes' }),
      ))
      .setTimeout(300)
      .build()

    tx.sign(signer)
    return this.submitAndWait(tx)
  }

  async vote(params: VoteParams, source: string, signer: Keypair): Promise<string> {
    const account = await this.server.getAccount(source)
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: this.passphrase })
      .addOperation(this.contract.call('vote',
        nativeToScVal(params.pool_id, { type: 'u32' }),
        nativeToScVal(params.voter, { type: 'address' }),
        nativeToScVal(params.approve, { type: 'bool' }),
      ))
      .setTimeout(300)
      .build()

    tx.sign(signer)
    return this.submitAndWait(tx)
  }

  async finalize(poolId: number, source: string, signer: Keypair): Promise<string> {
    const account = await this.server.getAccount(source)
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: this.passphrase })
      .addOperation(this.contract.call('finalize', nativeToScVal(poolId, { type: 'u32' })))
      .setTimeout(300)
      .build()

    tx.sign(signer)
    return this.submitAndWait(tx)
  }

  private async submitAndWait(tx: any): Promise<string> {
    const result = await this.server.sendTransaction(tx)
    if (result.status === 'PENDING') {
      const hash = result.hash!
      let attempts = 0
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 1000))
        const receipt = await this.server.getTransaction(hash)
        if (receipt.status === 'SUCCESS') return hash
        if (receipt.status === 'FAILED') throw new Error(`Transaction failed: ${hash}`)
        attempts++
      }
      throw new Error('Transaction timeout')
    }
    throw new Error(`Transaction rejected: ${result.status}`)
  }
}
