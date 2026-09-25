import { IsEnum } from 'class-validator'
import { ShopStatus } from '@prisma/client'

export class SetShopStatusDto {
  @IsEnum(ShopStatus) status!: ShopStatus
}
