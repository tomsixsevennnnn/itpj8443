import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ROLES_KEY } from './roles.decorator'

/** เช็ค role จาก DB เสมอ (ไม่ใช่ JWT claim) — กัน access token เก่า/ถูกปลอมอ้าง role ผิดหลัง promote/demote ผ่านหน้า owner */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const sub = request.user?.sub as string | undefined
    const dbUser = sub
      ? await this.prisma.user.findUnique({ where: { auth0Sub: sub }, select: { role: true } })
      : null
    const role = dbUser?.role === Role.OWNER ? 'owner' : 'customer'
    if (!required.includes(role)) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
    return true
  }
}
