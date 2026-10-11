import { decryptSecret, encryptSecret } from './secret-box'

const withKey = { SETTINGS_ENCRYPTION_KEY: 'test-key-1' } as NodeJS.ProcessEnv
const noKey = {} as NodeJS.ProcessEnv

describe('secret-box', () => {
  it('เข้ารหัสแล้วถอดกลับได้ และค่าที่เก็บไม่ใช่ข้อความเดิม', () => {
    const enc = encryptSecret('my-slipok-key', withKey)
    expect(enc).not.toContain('my-slipok-key')
    expect(enc.startsWith('enc:v1:')).toBe(true)
    expect(decryptSecret(enc, withKey)).toBe('my-slipok-key')
  })

  it('เข้ารหัสสองครั้งได้ผลต่างกัน (iv สุ่ม) และไม่เข้ารหัสซ้ำ', () => {
    const a = encryptSecret('k', withKey)
    expect(encryptSecret('k', withKey)).not.toBe(a)
    expect(encryptSecret(a, withKey)).toBe(a)
  })

  it('ไม่ตั้งกุญแจ — เก็บข้อความตรงๆ เหมือนเดิม และค่าเดิมที่ไม่ได้เข้ารหัสอ่านได้', () => {
    expect(encryptSecret('k', noKey)).toBe('k')
    expect(decryptSecret('plain-old-key', withKey)).toBe('plain-old-key')
  })

  it('ถอดไม่ได้ (กุญแจผิด/ไม่มีกุญแจ/ข้อมูลเสีย) — คืนค่าว่าง ไม่ throw', () => {
    const enc = encryptSecret('k', withKey)
    expect(decryptSecret(enc, { SETTINGS_ENCRYPTION_KEY: 'other' } as NodeJS.ProcessEnv)).toBe('')
    expect(decryptSecret(enc, noKey)).toBe('')
    expect(decryptSecret('enc:v1:broken', withKey)).toBe('')
  })

  it('ค่าว่างคืนค่าว่าง', () => {
    expect(encryptSecret('', withKey)).toBe('')
    expect(decryptSecret('', withKey)).toBe('')
  })
})
