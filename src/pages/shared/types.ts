export type Chain = {
  chainId: number
  name: string
  rpcUrl: string
  explorerUrl?: string
  currency: { name: string; symbol: string; decimals: number }
}

export type Token = {
  address: string
  symbol: string
  decimals: number
  chainId: number
}

export type StoredState = {
  encryptedVault?: string
  vaultSalt?: string
  vaultIv?: string
  selectedAccount?: string
  chains: Chain[]
  tokens: Token[]
}