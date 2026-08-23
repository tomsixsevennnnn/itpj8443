import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UploadDataUrlDto } from './dto/upload-data-url.dto'
import { UploadsService } from './uploads.service'

/**
 * เก็บรูปเป็นไฟล์บน disk แทนการฝัง base64 ตรงใน MenuItem.image / Settings.shopLogo / Settings.promptPayQr /
 * Booking.paymentSlipUrl — endpoint คืนแค่ path สั้นๆ ให้เอาไปเก็บในฟิลด์เหล่านั้นแทน
 *
 * จำกัด 10 ครั้ง/นาที/ผู้ใช้ ต่างหากจาก default 60 ของทั้งแอป — endpoint นี้เขียนไฟล์ลง disk จริง (ไม่ใช่แค่
 * query DB) ผู้ใช้คนเดียวสแปมอัปโหลดรัวๆ จะเปลืองดิสก์เร็วกว่า endpoint อื่นมาก
 */
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post('menu-image')
  @Roles('owner')
  async uploadMenuImage(@Body() dto: UploadDataUrlDto) {
    return { url: await this.uploads.saveDataUrl('menus', dto.dataUrl) }
  }

  @Post('promptpay-qr')
  @Roles('owner')
  async uploadPromptPayQr(@Body() dto: UploadDataUrlDto) {
    return { url: await this.uploads.saveDataUrl('qr', dto.dataUrl) }
  }

  @Post('shop-logo')
  @Roles('owner')
  async uploadShopLogo(@Body() dto: UploadDataUrlDto) {
    return { url: await this.uploads.saveDataUrl('logo', dto.dataUrl) }
  }

  @Post('content-image')
  @Roles('owner')
  async uploadContentImage(@Body() dto: UploadDataUrlDto) {
    return { url: await this.uploads.saveDataUrl('content', dto.dataUrl) }
  }

  @Post('payment-slip')
  @Roles('customer')
  async uploadPaymentSlip(@Body() dto: UploadDataUrlDto) {
    return { url: await this.uploads.saveDataUrl('slips', dto.dataUrl) }
  }
}
