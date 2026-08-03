import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/** payload ดิบจาก Auth0 JWT (sub, email, given_name, ... + custom role claim) */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.user as Record<string, unknown>
})
