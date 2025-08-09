class MiniMaskProvider {
  isMiniMask = true
  selectedAddress: string | null = null
  chainId: string | null = null

  async request({ method, params }: { method: string; params?: any[] }) {
    if (method === 'eth_requestAccounts') {
      const res = await chrome.runtime.sendMessage({ type: 'ETH_REQUEST_ACCOUNTS' })
      if (res?.accounts) this.selectedAddress = res.accounts[0]
      return res.accounts
    }
    throw new Error(`Unsupported method: ${method}`)
  }
}
;(window as any).ethereum = new MiniMaskProvider()