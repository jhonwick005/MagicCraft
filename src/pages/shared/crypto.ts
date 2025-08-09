const enc = new TextEncoder()
const dec = new TextDecoder()

export async function deriveKey(password: string, saltB64?: string) {
  const salt = saltB64 ? base64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  return { key, salt: bytesToBase64(salt) }
}

export async function encryptJson(password: string, data: unknown) {
  const { key, salt } = await deriveKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
  return { cipherB64: bytesToBase64(new Uint8Array(cipher)), salt, iv: bytesToBase64(iv) }
}

export async function decryptJson(password: string, cipherB64: string, saltB64: string, ivB64: string) {
  const { key } = await deriveKey(password, saltB64)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(ivB64) }, key, base64ToBytes(cipherB64))
  return JSON.parse(dec.decode(new Uint8Array(plain)))
}

export function bytesToBase64(b: Uint8Array) {
  return btoa(String.fromCharCode(...b))
}

export function base64ToBytes(s: string) {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}