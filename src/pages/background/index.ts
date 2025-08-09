import { decryptJson, encryptJson } from '../shared/crypto'
import { broadcastRaw } from '../shared/wallet'
import { loadState, saveState } from '../shared/storage'

let unlockedVault: any | null = null
let passwordCache: string | null = null

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  ;(async () => {
    try {
      const state = await loadState()
      if (msg.type === 'CREATE_VAULT') {
        const { cipherB64, salt, iv } = await encryptJson(msg.password, msg.vault)
        await saveState({ encryptedVault: cipherB64, vaultSalt: salt, vaultIv: iv })
        passwordCache = msg.password
        unlockedVault = msg.vault
        sendResponse({ ok: true })
      } else if (msg.type === 'IMPORT_VAULT') {
        const { cipherB64, salt, iv } = await encryptJson(msg.password, msg.vault)
        await saveState({ encryptedVault: cipherB64, vaultSalt: salt, vaultIv: iv })
        passwordCache = msg.password
        unlockedVault = msg.vault
        sendResponse({ ok: true })
      } else if (msg.type === 'UNLOCK') {
        if (!state.encryptedVault || !state.vaultSalt || !state.vaultIv) throw new Error('No vault')
        unlockedVault = await decryptJson(msg.password, state.encryptedVault, state.vaultSalt, state.vaultIv)
        passwordCache = msg.password
        sendResponse({ ok: true, vault: unlockedVault })
      } else if (msg.type === 'LOCK') {
        unlockedVault = null
        passwordCache = null
        sendResponse({ ok: true })
      } else if (msg.type === 'GET_VAULT') {
        sendResponse({ vault: unlockedVault })
      } else if (msg.type === 'SAVE_CHAINS') {
        await saveState({ chains: msg.chains })
        sendResponse({ ok: true })
      } else if (msg.type === 'SAVE_TOKENS') {
        await saveState({ tokens: msg.tokens })
        sendResponse({ ok: true })
      } else if (msg.type === 'STATE') {
        sendResponse({ state })
      } else if (msg.type === 'BROADCAST_RAW') {
        const { chain, raw } = msg
        const txHash = await broadcastRaw(chain, raw)
        sendResponse({ txHash })
      } else if (msg.type === 'ETH_REQUEST_ACCOUNTS') {
        if (!unlockedVault) throw new Error('Locked')
        sendResponse({ accounts: [unlockedVault.accounts[0].address] })
      }
    } catch (e:any) {
      sendResponse({ ok: false, error: e.message || String(e) })
    }
  })()
  return true
})