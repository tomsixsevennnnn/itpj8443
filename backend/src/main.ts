import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function bootstrap() {
  // ปิด body parser เริ่มต้นเพื่อตั้ง limit เอง — สลิปโอนเงิน/รูปเมนูถูกส่งเป็น base64 data URL ใน JSON body
  // ซึ่งใหญ่กว่า default 100kb ของ Express มาก (รูปย่อสุด 900px คุณภาพ 0.82 ก็อาจได้หลายร้อย KB ถึงเกิน 1MB หลัง encode เป็น base64)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  app.useBodyParser('json', { limit: '10mb' })
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true })

  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:8443').split(',').map((o) => o.trim())
  app.enableCors({ origin: origins, credentials: true })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  await app.listen(port)
}

bootstrap()
