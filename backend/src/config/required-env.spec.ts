import { assertRequiredEnv, missingEnv } from './required-env'

const FULL = { DATABASE_URL: 'postgresql://x', AUTH0_DOMAIN: 'a.auth0.com', AUTH0_AUDIENCE: 'https://api' } as NodeJS.ProcessEnv

describe('required env', () => {
  it('ครบทุกตัว — ไม่มีอะไรขาด ไม่ throw', () => {
    expect(missingEnv(FULL)).toEqual([])
    expect(() => assertRequiredEnv(FULL)).not.toThrow()
  })

  it('ขาด/ว่าง/มีแต่ช่องว่าง — แจ้งชื่อตัวแปรที่ขาดทั้งหมด', () => {
    const env = { ...FULL, DATABASE_URL: '', AUTH0_DOMAIN: '   ' } as NodeJS.ProcessEnv
    expect(missingEnv(env)).toEqual(['DATABASE_URL', 'AUTH0_DOMAIN'])
    expect(() => assertRequiredEnv(env)).toThrow(/DATABASE_URL, AUTH0_DOMAIN/)
  })

  it('ไม่มีตัวแปรเลย — ขาดทั้งสามตัว', () => {
    expect(missingEnv({} as NodeJS.ProcessEnv)).toHaveLength(3)
  })
})
