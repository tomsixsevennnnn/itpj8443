import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { PrismaService } from '../prisma/prisma.service'

/**
 * ตรวจสุขภาพระบบ ไม่ต้อง login และไม่นับในตัวจำกัดอัตราเรียก (ให้ Railway/ตัวมอนิเตอร์ยิงถี่ๆ ได้)
 *  - GET /health        : โปรเซสยังทำงาน (liveness) ไม่แตะฐานข้อมูล — ใช้เป็น Healthcheck Path ของ Railway
 *  - GET /health/ready  : พร้อมรับงานจริง (เชื่อมฐานข้อมูลได้) ไม่ได้ = 503
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  live() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) }
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok', database: 'up' }
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' })
    }
  }
}
