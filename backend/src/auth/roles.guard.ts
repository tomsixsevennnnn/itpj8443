import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { resolveShopContext } from './shop-context'
import { ROLES_KEY } from './roles.decorator'

type AppRole = 'owner' | 'customer' | 'super_admin'

/** เช็ค role จาก DB เสมอ (ไม่ใช่ JWT claim) — กัน access token เก่า/ถูกปลอมอ้าง role ผิดหลัง promote/demote ผ่านหน้า owner
 *  cache ผลไว้สั้นๆ ต่อ auth0Sub กัน DB query ทุก request (role แทบไม่เปลี่ยนระหว่างใช้งานปกติ) — ไม่ได้ผ่อนความเข้ม
 *  ของการเช็ค แค่ลดความถี่ ถ้าไม่พบ user ใน DB เลยยังคงถือเป็น customer เสมอ (ไม่ cache กรณีนี้ ไม่ fallback ไปเชื่อ
 *  JWT claim ใดๆ) ตามพฤติกรรมเดิมที่ roles.guard.spec.ts ยืนยันไว้ */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly cache = new Map<string, { role: AppRole; at: number }>()
  private readonly CACHE_TTL_MS = 5000

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const sub = request.user?.sub as string | undefined
    const role = await this.roleFor(sub, request.user?.requestedShopId as string | undefined)
    if (!required.includes(role)) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
    return true
  }

  /** role ในร้านที่ request นี้เปิดอยู่ (X-Shop-Id) — owner ร้านหนึ่งเป็น customer ของอีกร้านได้ ดู resolveShopContext */
  private async roleFor(sub: string | undefined, requestedShopId: string | undefined): Promise<AppRole> {
    if (!sub) return 'customer'

    const key = `${sub}|${requestedShopId ?? ''}`
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.at < this.CACHE_TTL_MS) return cached.role

    const ctx = await resolveShopContext(this.prisma, sub, requestedShopId)
    // ไม่พบ user ใน DB เลย = ถือเป็น customer โดย default เสมอ ไม่ cache เคสนี้ไว้ (แถวอาจถูกสร้างในวินาทีถัดไปหลัง sync)
    if (!ctx) return 'customer'

    let role: AppRole = 'customer'
    if (ctx.role === Role.OWNER) role = 'owner'
    else if (ctx.role === Role.SUPER_ADMIN) role = 'super_admin'
    this.cache.set(key, { role, at: Date.now() })
    return role
  }
}
