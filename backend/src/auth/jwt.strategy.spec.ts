import { extractQueryToken } from './jwt.strategy'

describe('extractQueryToken', () => {
  it('realtime (SSE) — รับ token จาก query ได้', () => {
    expect(extractQueryToken({ path: '/realtime/bookings', query: { access_token: 'abc' } } as any)).toBe('abc')
    expect(extractQueryToken({ path: '/realtime/app', query: { access_token: 'xyz' } } as any)).toBe('xyz')
  })

  it('route อื่นทุกอัน — ไม่รับ token จาก query (ต้องใช้ Authorization header)', () => {
    expect(extractQueryToken({ path: '/bookings', query: { access_token: 'abc' } } as any)).toBeNull()
    expect(extractQueryToken({ path: '/settings', query: { access_token: 'abc' } } as any)).toBeNull()
    expect(extractQueryToken({ path: '/realtime', query: { access_token: 'abc' } } as any)).toBeNull()
  })

  it('realtime แต่ไม่มี token หรือไม่ใช่ข้อความ — null', () => {
    expect(extractQueryToken({ path: '/realtime/app', query: {} } as any)).toBeNull()
    expect(extractQueryToken({ path: '/realtime/app', query: { access_token: ['a', 'b'] } } as any)).toBeNull()
  })
})
