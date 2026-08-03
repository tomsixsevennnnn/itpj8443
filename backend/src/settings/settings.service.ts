import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'

/** ค่าเริ่มต้น — ต้องตรงกับ DEFAULT_* ใน frontend src/documents.ts และ src/geo.ts */
const DEFAULT_SETTINGS = {
  id: 1,
  shopName: 'ร้านพิพัฒน์โภชนา',
  shopNameEn: 'Pipat Phochana Catering',
  shopInitials: 'PP',
  shopAddress: 'อ.เมืองนครปฐม จ.นครปฐม 73000',
  shopPhone: '034-XXX-XXX',
  shopLine: '@pipatphochana',
  depositRate: 0.5,
  deliveryFee: 2000,
  freeDeliveryMinTables: 30,
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.settings.findUnique({ where: { id: 1 } })
    if (existing) return existing
    return this.prisma.settings.create({ data: DEFAULT_SETTINGS })
  }

  async update(dto: UpdateSettingsDto) {
    await this.get()
    return this.prisma.settings.update({ where: { id: 1 }, data: dto })
  }
}
