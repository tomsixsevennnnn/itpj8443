import 'reflect-metadata'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { assertRequiredEnv } from './config/required-env'
import { UPLOAD_KINDS, UPLOADS_DIR } from './uploads/uploads.constants'

async function bootstrap() {
  // ขาดตัวแปรจำเป็น (DATABASE_URL / AUTH0_*) ให้หยุดตั้งแต่เริ่ม พร้อมบอกชื่อตัวแปร
  assertRequiredEnv()

  // ปิด body parser เริ่มต้นเพื่อตั้ง limit เอง — สลิปโอนเงิน/รูปเมนูถูกส่งเป็น base64 data URL ใน JSON body
  // ซึ่งใหญ่กว่า default 100kb ของ Express มาก (รูปย่อสุด 900px คุณภาพ 0.82 ก็อาจได้หลายร้อย KB ถึงเกิน 1MB หลัง encode เป็น base64)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  // อยู่หลัง proxy ของโฮสต์ (Railway มี 1 ชั้น) — ต้องบอก Express ให้เชื่อ X-Forwarded-For ไม่งั้น req.ip เป็น IP ของ proxy ตัวเดียว
  // ทำให้ตัวจำกัดอัตราเรียกนับทุกผู้ใช้เป็นคนเดียวกัน ตั้งจำนวนชั้น proxy ผ่าน TRUST_PROXY ได้ (0 = ปิด สำหรับรันตรงบนเครื่อง dev)
  const trustProxy = Number(process.env.TRUST_PROXY ?? 1)
  app.set('trust proxy', Number.isFinite(trustProxy) ? trustProxy : 1)

  // security headers พื้นฐาน — ฟรอนต์อยู่คนละ origin กับ backend และโหลดรูป /uploads ข้าม origin จึงต้องอนุญาต cross-origin สำหรับ resource
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  // ให้ปิดการเชื่อมต่อ DB/ปล่อย request ที่ค้างอยู่ให้เรียบร้อยตอน deploy ใหม่ (SIGTERM จาก Railway)
  app.enableShutdownHooks()

  app.useBodyParser('json', { limit: '10mb' })
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true })

  // เสิร์ฟไฟล์รูปที่อัปโหลดผ่าน UploadsService เป็น static asset ตรงๆ เฉพาะประเภทที่ตั้งใจให้สาธารณะเห็นได้
  // (เมนู/โลโก้/เนื้อหาหน้าเว็บ) — "slips" (สลิปโอนเงิน) ไม่รวมอยู่ในนี้เพราะเป็นข้อมูลอ่อนไหวของลูกค้า
  // ต้อง auth + ตรวจสิทธิ์รายใบจองก่อน อ่านผ่าน GET /bookings/:id/payment-slip เท่านั้น (ดู bookings.controller.ts)
  for (const kind of UPLOAD_KINDS) {
    if (kind === 'slips') continue
    app.useStaticAssets(join(UPLOADS_DIR, kind), { prefix: `/uploads/${kind}/` })
  }

  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:8443').split(',').map((o) => o.trim())
  app.enableCors({ origin: origins, credentials: true })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  await app.listen(port)
}

bootstrap()
