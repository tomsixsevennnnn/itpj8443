import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { GeoService } from './geo.service'

@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private geo: GeoService) {}

  @Get('resolve-maps-link')
  async resolveMapsLink(@Query('url') url: string) {
    return { url: await this.geo.resolveMapsLink(url ?? '') }
  }
}
