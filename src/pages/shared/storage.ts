import type { StoredState } from './types'

const DEFAULT: StoredState = {
  chains: [
    { chainId: 1, name: 'Ethereum', rpcUrl: 'https://rpc.ankr.com/eth', explorerUrl: 'https://etherscan.io', currency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
    { chainId: 137, name: 'Polygon', rpcUrl: 'https://polygon-rpc.com', explorerUrl: 'https://polygonscan.com', currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 } }
  ],
  tokens: []
}

export async function loadState(): Promise<StoredState> {
  return new Promise(resolve => {
    chrome.storage.local.get(DEFAULT, resolve)
  })
}

export async function saveState(patch: Partial<StoredState>) {
  return new Promise<void>(resolve => {
    chrome.storage.local.set(patch, () => resolve())
  })
}