import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/** ฟิลด์ของ JWT payload ที่โค้ดใช้จริง (ที่เหลือจาก Auth0 อ่านผ่าน index signature) + requestedShopId จาก header X-Shop-Id */
export interface JwtUser {
  sub: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  requestedShopId?: string
  [claim: string]: unknown
}

/** payload ดิบจาก Auth0 JWT (sub, email, given_name, ... + custom role claim) */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.user as JwtUser
})
