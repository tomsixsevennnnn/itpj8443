import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { GeoService } from './geo.service'

@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private geo: GeoService) {}

  // endpoint นี้สั่ง server ยิง fetch ออกไปยัง external host แทนผู้ใช้ (แม้จะ whitelist โดเมนไว้แล้ว) —
  // จำกัดให้เข้มกว่า default ของทั้ง API กันถูกใช้เป็นตัวรีเลย์ยิงถี่ๆ
  @Get('resolve-maps-link')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async resolveMapsLink(@Query('url') url: string) {
    return { url: await this.geo.resolveMapsLink(url ?? '') }
  }
}
