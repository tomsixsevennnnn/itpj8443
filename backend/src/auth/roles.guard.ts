import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AUTH0_ROLE_CLAIM } from './auth.constants'
import { ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const role = request.user?.[AUTH0_ROLE_CLAIM] === 'owner' ? 'owner' : 'customer'
    if (!required.includes(role)) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
    return true
  }
}
