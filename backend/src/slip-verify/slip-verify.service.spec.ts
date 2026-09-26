import { SlipVerifyService } from './slip-verify.service'

const baseParams = {
  apiKey: 'key1',
  branchId: 'branch1',
  fileBuffer: Buffer.from('img'),
  filename: 'slip.jpg',
  mimeType: 'image/jpeg',
  expectedAmount: 5000,
}

describe('SlipVerifyService', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('SlipOK ตอบสำเร็จ — คืนสถานะ VERIFIED พร้อม transRef', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { transRef: 'ref-1', amount: 5000 } }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result).toEqual({ status: 'VERIFIED', message: expect.any(String), transRef: 'ref-1' })
  })

  it('SlipOK ตอบสลิปซ้ำ (code 1012) — คืนสถานะ DUPLICATE', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 1012, message: 'สลิปซ้ำ สลิปนี้เคยส่งเข้ามาในระบบแล้ว', data: { transRef: 'ref-1' } }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('DUPLICATE')
    expect(result.message).toContain('สลิปซ้ำ')
  })

  it('SlipOK ตอบยอดไม่ตรง (code 1013) — คืนสถานะ AMOUNT_MISMATCH', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 1013, message: 'ยอดเงินไม่ตรง' }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('AMOUNT_MISMATCH')
  })

  it('SlipOK ตอบบัญชีผู้รับไม่ตรง (code 1014) — คืนสถานะ ACCOUNT_MISMATCH', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 1014, message: 'บัญชีผู้รับไม่ตรง' }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('ACCOUNT_MISMATCH')
  })

  it('SlipOK ตอบ error code อื่นที่ไม่รู้จัก — fallback เป็น REJECTED', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 1007, message: 'รูปภาพไม่มี QR Code' }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('REJECTED')
    expect(result.message).toBe('รูปภาพไม่มี QR Code')
  })

  it('เรียก SlipOK ไม่สำเร็จ (เครือข่ายล่ม) — คืนสถานะ UNAVAILABLE ไม่ throw', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('UNAVAILABLE')
  })

  it('SlipOK ตอบ body อ่านเป็น JSON ไม่ได้ — คืนสถานะ UNAVAILABLE ไม่ throw', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('invalid json')
      },
    })
    const service = new SlipVerifyService()

    const result = await service.checkSlip(baseParams)

    expect(result.status).toBe('UNAVAILABLE')
  })
})

describe('SlipVerifyService.checkQuota', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('key/branch id ถูกต้อง — คืน ok:true พร้อมโควต้าคงเหลือ', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { quota: 87, overQuota: 0 } }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkQuota('key1', 'branch1')

    expect(result).toEqual({ ok: true, quota: 87 })
  })

  it('key/branch id ผิด — คืน ok:false พร้อม message จาก SlipOK', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ code: 1001, message: 'ไม่พบข้อมูลสาขา กรุณาตรวจสอบไอดีสาขา' }),
    })
    const service = new SlipVerifyService()

    const result = await service.checkQuota('key1', 'wrong-branch')

    expect(result).toEqual({ ok: false, message: 'ไม่พบข้อมูลสาขา กรุณาตรวจสอบไอดีสาขา' })
  })

  it('เรียก SlipOK ไม่สำเร็จ (เครือข่ายล่ม) — คืน ok:false ไม่ throw', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    const service = new SlipVerifyService()

    const result = await service.checkQuota('key1', 'branch1')

    expect(result.ok).toBe(false)
  })
})
