/** Identifiants stables : les IDs existants ne sont jamais réécrits ; les nouveaux reçoivent un UUID v4. */
const uuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = new Uint8Array(16); globalThis.crypto.getRandomValues(b)
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}
export function stableId(prefix = 'obj') { return `${prefix}-${uuid()}` }
export function ensureStableId(record, prefix = 'obj') {
  if (record && String(record.id || '').trim()) return record
  return { ...record, id: stableId(prefix) }
}
/** Digest déterministe (FNV-1a 64 bits, hex) pour les clés d'import sans ID. */
export function textDigest(text) {
  let h = 0xcbf29ce484222325n
  for (const c of new TextEncoder().encode(String(text))) { h ^= BigInt(c); h = (h * 0x100000001b3n) & 0xffffffffffffffffn }
  return h.toString(16).padStart(16, '0')
}
