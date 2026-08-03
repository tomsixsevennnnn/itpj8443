import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UpdateSettingsDto } from './dto/update-settings.dto'
import { SettingsService } from './settings.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get()
  }

  @Patch()
  @Roles('owner')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto)
  }
}
