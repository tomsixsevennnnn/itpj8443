import { fetchVerifiedIdentity } from './userinfo'

describe('fetchVerifiedIdentity', () => {
  afterEach(() => jest.restoreAllMocks())
  const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response

  it('ไม่มี Bearer token หรือไม่มี domain — null โดยไม่เรียกเครือข่าย', async () => {
    const f = jest.spyOn(global, 'fetch')
    expect(await fetchVerifiedIdentity(undefined, 'a.auth0.com')).toBeNull()
    expect(await fetchVerifiedIdentity('Basic x', 'a.auth0.com')).toBeNull()
    expect(await fetchVerifiedIdentity('Bearer t', undefined)).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })

  it('เรียก /userinfo ด้วย token ของผู้เรียก และคืนอีเมลพร้อมสถานะยืนยัน', async () => {
    const f = jest.spyOn(global, 'fetch').mockResolvedValue(ok({ email: 'a@b.com', email_verified: true }))
    expect(await fetchVerifiedIdentity('Bearer tok', 'a.auth0.com')).toEqual({ email: 'a@b.com', emailVerified: true })
    expect(f.mock.calls[0][0]).toBe('https://a.auth0.com/userinfo')
    expect((f.mock.calls[0][1] as RequestInit).headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('email_verified ไม่ใช่ true เป๊ะ — ถือว่าไม่ยืนยัน', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(ok({ email: 'a@b.com', email_verified: 'true' }))
    expect(await fetchVerifiedIdentity('Bearer tok', 'a.auth0.com')).toEqual({ email: 'a@b.com', emailVerified: false })
  })

  it('Auth0 ตอบผิดปกติ/ไม่มีอีเมล/เครือข่ายล้ม — null ไม่ throw', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    expect(await fetchVerifiedIdentity('Bearer tok', 'a.auth0.com')).toBeNull()
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(ok({ sub: 'x' }))
    expect(await fetchVerifiedIdentity('Bearer tok', 'a.auth0.com')).toBeNull()
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('down'))
    expect(await fetchVerifiedIdentity('Bearer tok', 'a.auth0.com')).toBeNull()
  })
})
