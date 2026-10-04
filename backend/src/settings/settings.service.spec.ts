import { ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { SettingsService, slipOkFingerprint } from './settings.service'

const makeService = () => {
  const prisma = {
    settings: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    // ร้านมีอยู่จริงเป็นค่าเริ่มต้นในทุกเทส — เทสที่ต้องการเคส "ไม่พบร้าน" ค่อย mockResolvedValue(null) ทับเอง
    shop: { findUnique: jest.fn().mockResolvedValue({ id: 'shop1' }), update: jest.fn() },
    // $transaction แบบ callback — เรียก callback ด้วย prisma ตัวเดียวกันเลย (ไม่ต้อง mock tx แยก)
    $transaction: jest.fn((fn: any) => fn(prisma)),
  } as any
  const audit = { log: jest.fn() } as any
  const uploads = { deleteManagedFile: jest.fn(), makeThumbnailDataUrl: jest.fn().mockResolvedValue(null) } as any
  const realtime = { emitAppChanged: jest.fn() } as any
  return { service: new SettingsService(prisma, audit, uploads, realtime), prisma, audit, uploads, realtime }
}

const BASE_ROW = { id: 1, shopLogo: '', wageChef: 1200, depositRate: 0.5 }

describe('SettingsService', () => {
  it('get: isOwner=false ตัดฟิลด์ต้นทุนภายใน (ค่าแรง) ออกจาก response', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get('shop1', false)

    expect(result).not.toHaveProperty('wageChef')
  })

  it('get: isOwner=false ตัด SlipOK api key/branch id ออกด้วย (เป็นความลับของร้าน)', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, slipOkApiKey: 'secret', slipOkBranchId: 'b1' })

    const result = await service.get('shop1', false)

    expect(result).not.toHaveProperty('slipOkApiKey')
    expect(result).not.toHaveProperty('slipOkBranchId')
  })

  it('getSlipOkConfig: ยังไม่ได้ตั้งค่า — คืน null', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, slipOkApiKey: '', slipOkBranchId: '' })

    await expect(service.getSlipOkConfig('shop1')).resolves.toBeNull()
  })

  it('getSlipOkConfig: ตั้งค่าครบ — คืน apiKey/branchId', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, slipOkApiKey: 'key1', slipOkBranchId: 'branch1' })

    await expect(service.getSlipOkConfig('shop1')).resolves.toEqual({
      apiKey: 'key1',
      branchId: 'branch1',
      depositRate: 0.5,
      expectedReceiver: { channels: [] },
    })
  })

  it('getSlipOkConfig: คืนบัญชีรับเงินทั้งหมดที่ owner ตั้งไว้ แยกเป็นต่อบัญชี (ธนาคารหลัก/พร้อมเพย์หลัก/ที่เพิ่มเติม) ตัดบัญชีที่ว่างทิ้ง', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      slipOkApiKey: 'key1',
      slipOkBranchId: 'branch1',
      bankAccountName: 'ธนาทร รักดี',
      bankAccountNumber: '123-4-53109-6',
      promptPayId: '0861230000',
      promptPayFirstName: '',
      promptPayLastName: '',
      extraBankAccounts: [
        { bankName: 'ธนาคารกสิกรไทย', accountNumber: '999-9-99999-9', accountName: 'สมชาย ใจดี' },
        { bankName: '', accountNumber: '', accountName: '' },
      ],
      extraPromptPays: [{ id: '0891110000', firstName: 'มานี', lastName: 'มีตา' }],
    })

    const config = await service.getSlipOkConfig('shop1')

    // key = "bank:/pp:" + เลขเฉพาะตัวเลข ไว้ให้ลูกค้าเลือกช่องทางตอนแนบสลิป, label = ข้อความแสดงผล (ธนาคาร เลขบัญชี (ชื่อ))
    expect(config?.expectedReceiver.channels).toEqual([
      { names: ['ธนาทร รักดี'], accounts: ['123-4-53109-6'], key: 'bank:1234531096', label: '123-4-53109-6 (ธนาทร รักดี)' },
      { names: [], accounts: ['0861230000'], key: 'pp:0861230000', label: 'พร้อมเพย์ 0861230000' },
      {
        names: ['สมชาย ใจดี'],
        accounts: ['999-9-99999-9'],
        key: 'bank:9999999999',
        label: 'ธนาคารกสิกรไทย 999-9-99999-9 (สมชาย ใจดี)',
      },
      { names: ['มานี มีตา'], accounts: ['0891110000'], key: 'pp:0891110000', label: 'พร้อมเพย์ 0891110000 (มานี มีตา)' },
    ])
  })

  it('get: ร้านยังไม่เชื่อม SlipOK — ลูกค้าไม่เห็นบัญชีเพิ่มเติมด้วย แต่ owner เห็นครบ', async () => {
    const { service, prisma } = makeService()
    const extras = {
      extraBankAccounts: [{ bankName: 'ธนาคารกสิกรไทย', accountNumber: '999', accountName: 'ก' }],
      extraPromptPays: [{ id: '0891110000', firstName: 'ก', lastName: 'ข' }],
    }
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, ...extras, slipOkTestedHash: '' })

    expect(await service.get('shop1', false)).toEqual(expect.objectContaining({ extraBankAccounts: [], extraPromptPays: [] }))
    expect(await service.get('shop1', true)).toEqual(expect.objectContaining(extras))
  })

  it('recordSlipOkReceiver: จดผู้รับล่าสุดลง Settings โดยไม่ bump version (ไม่ให้ owner ที่แก้ฟอร์มอยู่ชน 409)', async () => {
    const { service, prisma } = makeService()
    prisma.settings.updateMany = jest.fn().mockResolvedValue({ count: 1 })

    await service.recordSlipOkReceiver(
      'shop1',
      { displayName: 'ธนาทร ร', name: 'THANATORN R', account: 'xxx-x-x3109-x', proxy: '', bankCode: '004' },
      true,
    )

    const call = (prisma.settings.updateMany as jest.Mock).mock.calls[0][0]
    expect(call.where).toEqual({ shopId: 'shop1' })
    expect(call.data).toEqual(
      expect.objectContaining({
        slipOkLastReceiverName: 'ธนาทร ร',
        slipOkLastReceiverAccount: 'xxx-x-x3109-x',
        slipOkLastReceivingBank: '004',
        slipOkLastReceiverMatched: true,
      }),
    )
    expect(call.data).not.toHaveProperty('version')
  })

  const PAYMENT = {
    bankName: 'ธนาคารกสิกรไทย',
    bankAccountNumber: '123-4-56789-0',
    bankAccountName: 'พีรณัฐ ทุ่งศรีแก้ว',
    promptPayId: '0929364180',
    promptPayFirstName: 'พีรณัฐ',
    promptPayLastName: 'ทุ่งศรีแก้ว',
  }

  it('get: ร้านยังไม่เชื่อม SlipOK (ยังไม่ผ่านการทดสอบ) — ลูกค้าไม่เห็นข้อมูลชำระเงิน (ว่างเปล่า) แต่ owner เห็นครบ', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, ...PAYMENT, slipOkApiKey: 'k', slipOkBranchId: 'b', slipOkTestedHash: '' })

    const customer = await service.get('shop1', false)
    expect(customer).toEqual(expect.objectContaining({ bankName: '', bankAccountNumber: '', promptPayId: '', promptPayFirstName: '', slipOkConnected: false }))

    const owner = await service.get('shop1', true)
    expect(owner).toEqual(expect.objectContaining({ ...PAYMENT, slipOkConnected: false }))
  })

  it('get: เชื่อม SlipOK แล้ว (ลายนิ้วมือตรงกับ key/branch ที่บันทึกอยู่) — ลูกค้าเห็นข้อมูลชำระเงิน และไม่ส่งลายนิ้วมือออกไป', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      ...PAYMENT,
      slipOkApiKey: 'k',
      slipOkBranchId: 'b',
      slipOkTestedHash: slipOkFingerprint('k', 'b'),
    })

    const customer = await service.get('shop1', false)

    expect(customer).toEqual(expect.objectContaining({ ...PAYMENT, slipOkConnected: true }))
    expect(customer).not.toHaveProperty('slipOkTestedHash')
    expect((await service.get('shop1', true)) as any).not.toHaveProperty('slipOkTestedHash')
  })

  it('get: เปลี่ยน API key/Branch ID หลังทดสอบ (ลายนิ้วมือไม่ตรง) — กลับไปเป็นยังไม่เชื่อม ลูกค้าไม่เห็นข้อมูลชำระเงินจนกว่าจะทดสอบใหม่', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      ...PAYMENT,
      slipOkApiKey: 'new-key',
      slipOkBranchId: 'b',
      slipOkTestedHash: slipOkFingerprint('old-key', 'b'),
    })

    const customer = await service.get('shop1', false)

    expect(customer).toEqual(expect.objectContaining({ bankAccountNumber: '', slipOkConnected: false }))
  })

  it('markSlipOkTested: จำลายนิ้วมือของคู่ key/branch ที่ทดสอบผ่าน โดยไม่ bump version', async () => {
    const { service, prisma } = makeService()
    prisma.settings.updateMany = jest.fn().mockResolvedValue({ count: 1 })

    await service.markSlipOkTested('shop1', 'k', 'b')

    expect(prisma.settings.updateMany).toHaveBeenCalledWith({ where: { shopId: 'shop1' }, data: { slipOkTestedHash: slipOkFingerprint('k', 'b') } })
  })

  it('slipOkFingerprint: sha256 hex ของข้อความ "apiKey|branchId" (ต้องตรงกับสูตร SQL ใน migration ที่ตั้งค่าให้ร้านเดิม)', () => {
    // ค่าอ้างอิงคำนวณอิสระด้วย sha256sum ของข้อความ k|b
    expect(slipOkFingerprint('k', 'b')).toBe('37c30a5230ea01086bc3a845c3ea5439668eecff49031e48865c675247e000cb')
    expect(slipOkFingerprint('k', 'b')).not.toBe(slipOkFingerprint('k', 'c'))
  })

  it('get: ลูกค้า (isOwner=false) ไม่เห็นข้อมูลผู้รับเงินที่ SlipOK เห็นล่าสุด', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, slipOkLastReceiverName: 'ธนาทร ร', slipOkLastReceiverAccount: 'xxx' })

    const result = await service.get('shop1', false)

    expect(result).not.toHaveProperty('slipOkLastReceiverName')
    expect(result).not.toHaveProperty('slipOkLastReceiverAccount')
  })

  it('get: isOwner=true คืนทุกฟิลด์รวมค่าแรง', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })

    const result = await service.get('shop1', true)

    expect(result).toHaveProperty('wageChef', 1200)
  })

  it('get: ยังไม่เคยมีแถวใน DB — สร้างแถว default ให้อัตโนมัติ', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue(null)
    prisma.settings.create.mockResolvedValue({ ...BASE_ROW })

    await service.get('shop1', true)

    expect(prisma.settings.create).toHaveBeenCalled()
  })

  it('get: shopId ไม่มีร้านจริงในระบบ (เช่นร้านถูกลบไปแล้ว) — โยน NotFoundException แทนที่จะพัง FK violation ตอน create', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue(null)
    prisma.shop.findUnique.mockResolvedValue(null)

    await expect(service.get('deleted-shop', true)).rejects.toThrow('ไม่พบร้านนี้')
    expect(prisma.settings.create).not.toHaveBeenCalled()
  })

  it('update: บันทึก audit log ด้วย before/after', async () => {
    const { service, prisma, audit } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'settings.update',
      'Settings',
      '1',
      { ...BASE_ROW },
      { ...BASE_ROW, shopName: 'ใหม่' },
      'shop1',
    )
  })

  it("update: ชื่อร้านเปลี่ยน — ซิงค์เข้า Shop.name และแจ้ง realtime หัวข้อ 'shop' ให้ super admin เห็นทันที", async () => {
    const { service, prisma, realtime } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopName: 'เดิม' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(prisma.shop.update).toHaveBeenCalledWith({ where: { id: 'shop1' }, data: { name: 'ใหม่' } })
    expect(realtime.emitAppChanged).toHaveBeenCalledWith('shop')
  })

  it("update: ชื่อร้านไม่เปลี่ยน — ไม่แจ้งหัวข้อ 'shop' (ไม่ให้ทุก client โหลดข้อมูลใหม่โดยไม่จำเป็น)", async () => {
    const { service, prisma, realtime } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopName: 'เดิม' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'เดิม', wageChef: 1500 })

    await service.update('shop1', { shopName: 'เดิม', wageChef: 1500 } as any, 'auth0|owner')

    expect(realtime.emitAppChanged).not.toHaveBeenCalled()
  })

  it('update: ส่ง expectedVersion เป็นเงื่อนไข where แบบ compound key และ increment version ให้', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, version: 3 })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่', version: 4 })

    await service.update('shop1', { shopName: 'ใหม่', expectedVersion: 3 } as any, 'auth0|owner')

    expect(prisma.settings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_version: { id: 1, version: 3 } },
        data: expect.objectContaining({ shopName: 'ใหม่', version: { increment: 1 } }),
      }),
    )
  })

  it('update: version ไม่ตรง (มีคนแก้ไปแล้ว) — โยน ConflictException แทนที่จะบันทึกทับเงียบๆ', async () => {
    const { service, prisma, audit } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, version: 3 })
    prisma.settings.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record found', { code: 'P2025', clientVersion: '6.19.3' }),
    )

    await expect(service.update('shop1', { shopName: 'ใหม่', expectedVersion: 1 } as any, 'auth0|owner')).rejects.toThrow(
      ConflictException,
    )
    expect(audit.log).not.toHaveBeenCalled()
  })

  it('update: เปลี่ยนโลโก้ร้าน — ลบไฟล์โลโก้เก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/new.png' })

    await service.update('shop1', { shopLogo: '/uploads/logo/new.png' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/logo/old.png')
  })

  it('update: ไม่แตะโลโก้เลย — ไม่ลบไฟล์ใดๆ', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png', shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('update: เปลี่ยนโลโก้ร้าน — ย่อโลโก้เก่าเป็น thumbnail ฝังใน audit log ก่อนค่อยลบไฟล์จริงทิ้ง', async () => {
    const { service, prisma, audit, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/old.png' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/uploads/logo/new.png' })
    uploads.makeThumbnailDataUrl.mockResolvedValue('data:image/jpeg;base64,thumb')

    await service.update('shop1', { shopLogo: '/uploads/logo/new.png' } as any, 'auth0|owner')

    expect(uploads.makeThumbnailDataUrl).toHaveBeenCalledWith('/uploads/logo/old.png')
    expect(audit.log).toHaveBeenCalledWith(
      'auth0|owner',
      'settings.update',
      'Settings',
      '1',
      { ...BASE_ROW, shopLogo: 'data:image/jpeg;base64,thumb' },
      { ...BASE_ROW, shopLogo: '/uploads/logo/new.png' },
      'shop1',
    )
  })

  it('update: เปลี่ยนรูป Hero — ลบไฟล์ Hero เก่าทิ้ง', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: [] } })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, homeContent: { heroImage: '/uploads/content/new-hero.jpg', gallery: [] } })

    await service.update('shop1', { homeContent: { heroImage: '/uploads/content/new-hero.jpg', gallery: [] } } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/content/old-hero.jpg')
    expect(uploads.deleteManagedFile).toHaveBeenCalledTimes(1)
  })

  it('update: ตัดรูปออกจากแกลเลอรี — ลบเฉพาะไฟล์ที่ถูกตัดออก ไม่แตะรูปที่ยังอยู่', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg', '/uploads/content/b.jpg'] },
    })
    prisma.settings.update.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg'] },
    })

    await service.update('shop1', { homeContent: { heroImage: '', gallery: ['/uploads/content/a.jpg'] } } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).toHaveBeenCalledWith('/uploads/content/b.jpg')
    expect(uploads.deleteManagedFile).not.toHaveBeenCalledWith('/uploads/content/a.jpg')
    expect(uploads.deleteManagedFile).toHaveBeenCalledTimes(1)
  })

  it('update: ไม่ได้ส่ง homeContent มาเลย — ไม่ยุ่งกับไฟล์ Hero/แกลเลอรีเดิม', async () => {
    const { service, prisma, uploads } = makeService()
    prisma.settings.findUnique.mockResolvedValue({
      ...BASE_ROW,
      homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: ['/uploads/content/a.jpg'] },
    })
    prisma.settings.update.mockResolvedValue({
      ...BASE_ROW,
      shopName: 'ใหม่',
      homeContent: { heroImage: '/uploads/content/old-hero.jpg', gallery: ['/uploads/content/a.jpg'] },
    })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(uploads.deleteManagedFile).not.toHaveBeenCalled()
  })

  it('update: owner แก้ชื่อร้าน (shopName) — ซิงค์ไปที่ Shop.name ที่ super admin เห็นด้วย', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopName: 'เดิม' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopName: 'ใหม่' })

    await service.update('shop1', { shopName: 'ใหม่' } as any, 'auth0|owner')

    expect(prisma.shop.update).toHaveBeenCalledWith({ where: { id: 'shop1' }, data: { name: 'ใหม่' } })
  })

  it('update: ไม่ได้แก้ชื่อร้าน — ไม่ไปแตะ Shop.name', async () => {
    const { service, prisma } = makeService()
    prisma.settings.findUnique.mockResolvedValue({ ...BASE_ROW, shopName: 'เดิม' })
    prisma.settings.update.mockResolvedValue({ ...BASE_ROW, shopLogo: '/x.png' })

    await service.update('shop1', { shopLogo: '/x.png' } as any, 'auth0|owner')

    expect(prisma.shop.update).not.toHaveBeenCalled()
  })
})
