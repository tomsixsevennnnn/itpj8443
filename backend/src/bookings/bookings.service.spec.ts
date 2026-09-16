import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { BookingsService } from './bookings.service'

const SETTINGS = {
  deliveryFee: 2000,
  freeDeliveryMinTables: 30,
  fuelCostPerKm: 8,
  metroProvinces: ['กรุงเทพมหานคร'],
  homeProvince: 'นครปฐม',
  shopLocationLat: 13.8196,
  shopLocationLng: 100.0603,
  closedDates: [] as string[],
}

const PACKAGE = {
  id: 'pkg1',
  name: 'แพ็กเกจทดสอบ',
  pricePerTable: 1000,
  courses: [{ items: [{ name: 'ข้าวผัด' }, { name: 'ต้มยำ' }] }],
}

const makeService = () => {
  const prisma = {
    package: { findUnique: jest.fn() },
    booking: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    bookingCounter: { upsert: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(prisma)),
  } as any
  const settingsService = { get: jest.fn().mockResolvedValue(SETTINGS) } as any
  const audit = { log: jest.fn() } as any
  const uploads = { deleteManagedFile: jest.fn() } as any
  const realtime = { emitBookingsChanged: jest.fn() } as any
  return {
    service: new BookingsService(prisma, settingsService, audit, uploads, realtime),
    prisma,
    settingsService,
    audit,
    uploads,
    realtime,
  }
}

const baseDto = (overrides: Partial<any> = {}) => ({
  date: '2026-12-01',
  timeSlot: 'evening',
  tables: 10,
  guestCount: 80,
  packageId: 'pkg1',
  location: 'บ้านทดสอบ',
  locationDetail: { province: 'นครปฐม', address: '', lat: 13.8, lng: 100.06 },
  menus: ['ข้าวผัด'],
  ...overrides,
})

describe('BookingsService.create', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('ไม่พบแพ็กเกจ — throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(null)

    await expect(service.create('c1', 'ลูกค้า', '0800000000', baseDto())).rejects.toThrow(NotFoundException)
  })

  it('เมนูที่เลือกไม่อยู่ในแพ็กเกจ — throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)

    await expect(
      service.create('c1', 'ลูกค้า', '0800000000', baseDto({ menus: ['เมนูปลอม'] })),
    ).rejects.toThrow(BadRequestException)
  })

  it('วันที่เลือกอยู่ใน closedDates — throw BadRequestException', async () => {
    const { service, prisma, settingsService } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    settingsService.get.mockResolvedValue({ ...SETTINGS, closedDates: ['2026-12-01'] })

    await expect(service.create('c1', 'ลูกค้า', '0800000000', baseDto())).rejects.toThrow(BadRequestException)
  })

  it('zone = home — ไม่คิดค่าขนส่ง ราคารวมมาจากราคาแพ็กเกจใน DB เท่านั้น ไม่เชื่อ dto', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    prisma.booking.findFirst.mockResolvedValue(null)
    prisma.bookingCounter.upsert.mockResolvedValue({ lastNo: 1 })
    prisma.booking.create = jest.fn((args: any) => args.data)

    const result = await service.create(
      'c1',
      'ลูกค้า',
      '0800000000',
      baseDto({ locationDetail: { province: 'นครปฐม', address: '' } }),
    )

    expect(result.deliveryFee).toBe(0)
    expect(result.pricePerTable).toBe(1000)
    expect(result.totalPrice).toBe(10_000)
  })

  it('สร้างสำเร็จ — แจ้งเตือน realtime ให้ client ที่เปิดหน้าค้างไว้ refetch', async () => {
    const { service, prisma, realtime } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    prisma.booking.findFirst.mockResolvedValue(null)
    prisma.bookingCounter.upsert.mockResolvedValue({ lastNo: 1 })
    prisma.booking.create = jest.fn((args: any) => args.data)

    await service.create('c1', 'ลูกค้า', '0800000000', baseDto({ locationDetail: { province: 'นครปฐม', address: '' } }))

    expect(realtime.emitBookingsChanged).toHaveBeenCalledTimes(1)
  })

  it('zone = metro ไม่ถึงขั้นต่ำ — คิดค่าขนส่งตาม settings.deliveryFee', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    prisma.booking.findFirst.mockResolvedValue(null)
    prisma.bookingCounter.upsert.mockResolvedValue({ lastNo: 1 })
    prisma.booking.create = jest.fn((args: any) => args.data)

    const result = await service.create(
      'c1',
      'ลูกค้า',
      '0800000000',
      baseDto({ tables: 5, locationDetail: { province: 'กรุงเทพมหานคร', address: '' } }),
    )

    expect(result.deliveryFee).toBe(2000)
    expect(result.totalPrice).toBe(5 * 1000 + 2000)
  })

  it('zone = outside ไม่มีพิกัด lat/lng — throw BadRequestException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)

    await expect(
      service.create(
        'c1',
        'ลูกค้า',
        '0800000000',
        baseDto({ locationDetail: { province: 'เชียงใหม่', address: '' } }),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('zone = outside เรียก OSRM ไม่สำเร็จ — throw ServiceUnavailableException (ไม่ fallback ไปเชื่อ distanceKm จาก client)', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))

    await expect(
      service.create(
        'c1',
        'ลูกค้า',
        '0800000000',
        baseDto({ locationDetail: { province: 'เชียงใหม่', address: '', lat: 18.7, lng: 98.9, distanceKm: 1 } }),
      ),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('zone = outside คำนวณระยะทางสำเร็จ — ค่าขนส่งมาจาก OSRM ไม่ใช่ distanceKm ปลอมที่ client ส่งมา', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    prisma.booking.findFirst.mockResolvedValue(null)
    prisma.bookingCounter.upsert.mockResolvedValue({ lastNo: 1 })
    prisma.booking.create = jest.fn((args: any) => args.data)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [{ distance: 50_000 }] }),
    })

    const result = await service.create(
      'c1',
      'ลูกค้า',
      '0800000000',
      // client ปลอม distanceKm เป็น 1 กม. — ต้องถูกเมิน ใช้ผลจาก OSRM (50 กม.) แทน
      baseDto({ locationDetail: { province: 'เชียงใหม่', address: '', lat: 18.7, lng: 98.9, distanceKm: 1 } }),
    )

    expect(result.deliveryFee).toBe(Math.round(50 * 2 * 8))
  })

  it('มีงานจองวันเดียวกันอยู่แล้ว (ยังกินคิว) — throw ConflictException', async () => {
    const { service, prisma } = makeService()
    prisma.package.findUnique.mockResolvedValue(PACKAGE)
    prisma.booking.findFirst.mockResolvedValue({ id: 'existing' })

    await expect(
      service.create('c1', 'ลูกค้า', '0800000000', baseDto({ locationDetail: { province: 'นครปฐม' } })),
    ).rejects.toThrow('วันที่นี้มีงานจองอยู่แล้ว')
  })
})

describe('BookingsService.updateAsOwner', () => {
  it('บันทึก audit log พร้อม before/after', async () => {
    const { service, prisma, audit } = makeService()
    const before = { id: 'b1', status: 'PENDING' }
    const after = { id: 'b1', status: 'CONFIRMED' }
    prisma.booking.findUnique.mockResolvedValue(before)
    prisma.booking.update.mockResolvedValue(after)

    const result = await service.updateAsOwner('b1', { status: 'CONFIRMED' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith('auth0|owner', 'booking.update', 'Booking', 'b1', before, after)
    expect(result).toBe(after)
  })

  it('อัปเดตสำเร็จ — แจ้งเตือน realtime ให้ client ที่เปิดหน้าค้างไว้ refetch', async () => {
    const { service, prisma, realtime } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', status: 'PENDING' })
    prisma.booking.update.mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

    await service.updateAsOwner('b1', { status: 'CONFIRMED' } as any, 'auth0|owner')

    expect(realtime.emitBookingsChanged).toHaveBeenCalledTimes(1)
  })

  it('ไม่พบใบจอง — throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.booking.findUnique.mockResolvedValue(null)

    await expect(service.updateAsOwner('missing', {} as any, 'auth0|owner')).rejects.toThrow(NotFoundException)
  })
})

describe('BookingsService.updatePaymentSlipAsCustomer', () => {
  it('ไม่ใช่เจ้าของใบจองนี้ — throw ForbiddenException', async () => {
    const { service, prisma } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'owner-of-booking' })

    await expect(
      service.updatePaymentSlipAsCustomer('b1', 'someone-else', '/uploads/slips/a.jpg'),
    ).rejects.toThrow('ไม่มีสิทธิ์แก้ไขใบจองนี้')
  })

  it('แนบสลิปใหม่ทับของเดิม — ลบไฟล์สลิปเก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'c1', paymentSlipUrl: '/uploads/slips/old.jpg' })
    prisma.booking.update.mockResolvedValue({ id: 'b1', paymentSlipUrl: '/uploads/slips/new.jpg' })

    await service.updatePaymentSlipAsCustomer('b1', 'c1', '/uploads/slips/new.jpg')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/slips/old.jpg')
  })

  it('แนบสลิปสำเร็จ — แจ้งเตือน realtime ให้ client ที่เปิดหน้าค้างไว้ refetch', async () => {
    const { service, prisma, realtime } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'c1', paymentSlipUrl: null })
    prisma.booking.update.mockResolvedValue({ id: 'b1', paymentSlipUrl: '/uploads/slips/new.jpg' })

    await service.updatePaymentSlipAsCustomer('b1', 'c1', '/uploads/slips/new.jpg')

    expect(realtime.emitBookingsChanged).toHaveBeenCalledTimes(1)
  })
})

describe('BookingsService.getPaymentSlipPath', () => {
  it('ไม่ใช่เจ้าของใบจองและไม่ใช่ owner ร้าน — throw ForbiddenException', async () => {
    const { service, prisma } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'owner-of-booking', paymentSlipUrl: '/uploads/slips/a.jpg' })

    await expect(service.getPaymentSlipPath('b1', 'someone-else', false)).rejects.toThrow(ForbiddenException)
  })

  it('ยังไม่มีสลิปแนบมา — throw NotFoundException', async () => {
    const { service, prisma } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'c1', paymentSlipUrl: null })

    await expect(service.getPaymentSlipPath('b1', 'c1', false)).rejects.toThrow(NotFoundException)
  })

  it('เจ้าของใบจองเข้าถึงสลิปของตัวเองได้ — คืน absolute path จาก UploadsService', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'c1', paymentSlipUrl: '/uploads/slips/a.jpg' })
    uploads.resolveManagedFilePath = jest.fn().mockReturnValue('/abs/uploads/slips/a.jpg')

    await expect(service.getPaymentSlipPath('b1', 'c1', false)).resolves.toBe('/abs/uploads/slips/a.jpg')
  })

  it('owner ร้านเข้าถึงสลิปของใบจองใครก็ได้', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'someone-else', paymentSlipUrl: '/uploads/slips/a.jpg' })
    uploads.resolveManagedFilePath = jest.fn().mockReturnValue('/abs/uploads/slips/a.jpg')

    await expect(service.getPaymentSlipPath('b1', '', true)).resolves.toBe('/abs/uploads/slips/a.jpg')
  })
})
