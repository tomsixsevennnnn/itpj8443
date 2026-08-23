import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// UPLOADS_DIR อ่านจาก env ตอน import module ครั้งแรก — ต้องตั้งค่าก่อน require แต่ละ test เพื่อชี้ไปที่โฟลเดอร์ชั่วคราวแยกกัน
// jest.resetModules() ทำให้ require('@nestjs/common') ในรอบถัดไปได้ instance ของคลาสใหม่ (คนละ module registry
// กับที่ import แบบ static ไว้ด้านบนไฟล์) ต้อง require BadRequestException จาก registry เดียวกับ UploadsService เสมอ
describe('UploadsService', () => {
  let tempDir: string
  let UploadsService: typeof import('./uploads.service').UploadsService
  let BadRequestException: typeof import('@nestjs/common').BadRequestException

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'uploads-spec-'))
    process.env.UPLOADS_DIR = tempDir
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    UploadsService = require('./uploads.service').UploadsService
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    BadRequestException = require('@nestjs/common').BadRequestException
  })

  afterEach(() => {
    delete process.env.UPLOADS_DIR
    rmSync(tempDir, { recursive: true, force: true })
  })

  const PNG_1PX =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

  it('saveDataUrl: บันทึกไฟล์ลง disk ใน subfolder ตาม kind แล้วคืน path /uploads/<kind>/<uuid>.<ext>', async () => {
    const service = new UploadsService()
    const url = await service.saveDataUrl('menus', PNG_1PX)

    expect(url).toMatch(/^\/uploads\/menus\/[0-9a-f-]+\.png$/)
    const saved = readFileSync(join(tempDir, url.replace('/uploads/', '')))
    expect(saved.length).toBeGreaterThan(0)
  })

  it('saveDataUrl: kind ที่ไม่รู้จัก throw BadRequestException', async () => {
    const service = new UploadsService()
    await expect(service.saveDataUrl('invalid' as any, PNG_1PX)).rejects.toThrow(BadRequestException)
  })

  it('saveDataUrl: ไม่ใช่ data URL รูปแบบ base64 throw BadRequestException', async () => {
    const service = new UploadsService()
    await expect(service.saveDataUrl('menus', 'not-a-data-url')).rejects.toThrow(BadRequestException)
  })

  it('saveDataUrl: mime type ที่ไม่รองรับ (เช่น svg) throw BadRequestException', async () => {
    const service = new UploadsService()
    await expect(
      service.saveDataUrl('menus', 'data:image/svg+xml;base64,PHN2Zy8+'),
    ).rejects.toThrow(BadRequestException)
  })

  it('deleteManagedFile: ลบไฟล์ที่มีอยู่จริงสำเร็จ', async () => {
    const service = new UploadsService()
    const url = await service.saveDataUrl('menus', PNG_1PX)
    const filePath = join(tempDir, url.replace('/uploads/', ''))
    expect(() => readFileSync(filePath)).not.toThrow()

    await service.deleteManagedFile(url)

    expect(() => readFileSync(filePath)).toThrow()
  })

  it('deleteManagedFile: path traversal (../) ปฏิเสธการลบ ไม่แตะไฟล์นอกโฟลเดอร์ uploads', async () => {
    const service = new UploadsService()
    await expect(service.deleteManagedFile('/uploads/../../etc/passwd')).resolves.toBeUndefined()
  })

  it('deleteManagedFile: ค่าว่าง/ไม่ใช่ /uploads/ ไม่ทำอะไรเลย ไม่ throw', async () => {
    const service = new UploadsService()
    await expect(service.deleteManagedFile(null)).resolves.toBeUndefined()
    await expect(service.deleteManagedFile('https://example.com/a.png')).resolves.toBeUndefined()
  })
})
