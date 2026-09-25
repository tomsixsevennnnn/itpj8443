import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { BookingsModule } from './bookings/bookings.module'
import { GeoModule } from './geo/geo.module'
import { MenusModule } from './menus/menus.module'
import { PackagesModule } from './packages/packages.module'
import { PrismaModule } from './prisma/prisma.module'
import { RealtimeModule } from './realtime/realtime.module'
import { SettingsModule } from './settings/settings.module'
import { ShopsModule } from './shops/shops.module'
import { UploadsModule } from './uploads/uploads.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ค่าเริ่มต้นทั้ง API: 60 คำขอ/นาที ต่อ IP — endpoint ที่ต้องเข้มกว่านี้ (สร้างใบจอง, ตามลิงก์ Google Maps)
    // ตั้ง @Throttle() override เฉพาะจุดเพิ่มเติมเอง (ดู BookingsController, GeoController)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    PackagesModule,
    MenusModule,
    SettingsModule,
    ShopsModule,
    GeoModule,
    UploadsModule,
    RealtimeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
