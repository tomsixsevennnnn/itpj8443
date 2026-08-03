import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { BookingsModule } from './bookings/bookings.module'
import { MenusModule } from './menus/menus.module'
import { PackagesModule } from './packages/packages.module'
import { PrismaModule } from './prisma/prisma.module'
import { SettingsModule } from './settings/settings.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    PackagesModule,
    MenusModule,
    SettingsModule,
  ],
})
export class AppModule {}
