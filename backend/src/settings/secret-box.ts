import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1:'

/** กุญแจเข้ารหัสความลับของร้าน (เช่น SlipOK API key) ที่เก็บใน DB — ไม่ตั้ง = เก็บแบบเดิม (ข้อความตรงๆ) เพื่อไม่ให้ระบบเดิมพัง */
const keyFrom = (env: NodeJS.ProcessEnv): Buffer | null => {
  const raw = env.SETTINGS_ENCRYPTION_KEY
  return raw ? createHash('sha256').update(raw).digest() : null
}

/** เข้ารหัสด้วย AES-256-GCM (ค่าว่าง/ไม่มีกุญแจ/เข้ารหัสแล้ว = คืนค่าเดิม) */
export function encryptSecret(plain: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = keyFrom(env)
  if (!plain || !key || plain.startsWith(PREFIX)) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return PREFIX + [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.')
}

/** ถอดรหัส — ค่าที่ไม่ได้เข้ารหัส (ข้อมูลเดิม) คืนตามเดิม; ถอดไม่ได้ (ไม่มีกุญแจ/กุญแจเปลี่ยน/ข้อมูลเสีย) คืนสตริงว่าง = ถือว่ายังไม่ได้ตั้งค่า */
export function decryptSecret(stored: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored
  const key = keyFrom(env)
  if (!key) return ''
  try {
    const [iv, tag, data] = stored.slice(PREFIX.length).split('.').map(p => Buffer.from(p, 'base64'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}
