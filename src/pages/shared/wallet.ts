import { HDNodeWallet, Mnemonic, Wallet, ethers } from 'ethers'
import type { Chain } from './types'

export type Account = { address: string; path: string; privateKey: string }
export type Vault = { accounts: Account[] }

export function createVaultFromMnemonic(mnemonic?: string, count = 1): { vault: Vault; mnemonic: string } {
  const m = mnemonic ?? Mnemonic.fromEntropy(ethers.randomBytes(16)).phrase
  const root = HDNodeWallet.fromPhrase(m)
  const accounts: Account[] = []
  for (let i = 0; i < count; i++) {
    const path = `m/44'/60'/0'/0/${i}`
    const child = root.derivePath(path)
    accounts.push({ address: child.address, path, privateKey: child.privateKey })
  }
  return { vault: { accounts }, mnemonic: m }
}

export function importFromPrivateKey(pk: string): Vault {
  const w = new Wallet(pk)
  return { accounts: [{ address: w.address, path: 'imported', privateKey: w.privateKey }] }
}

export async function sendJsonRpc(chain: Chain, method: string, params: any[]) {
  const res = await fetch(chain.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result
}

export async function getNonce(chain: Chain, address: string) {
  return await sendJsonRpc(chain, 'eth_getTransactionCount', [address, 'pending'])
}

export async function broadcastRaw(chain: Chain, raw: string) {
  return await sendJsonRpc(chain, 'eth_sendRawTransaction', [raw])
}