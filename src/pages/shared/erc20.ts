import { ethers } from 'ethers'

export const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)'
]

export async function fetchTokenMeta(rpcUrl: string, address: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const c = new ethers.Contract(address, ERC20_ABI, provider)
  const [decimals, symbol] = await Promise.all([c.decimals(), c.symbol()])
  return { symbol, decimals: Number(decimals) }
}