import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:8443').split(',').map((o) => o.trim())
  app.enableCors({ origin: origins, credentials: true })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  await app.listen(port)
}

bootstrap()
