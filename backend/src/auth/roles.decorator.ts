import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

/** จำกัด endpoint ให้ role ที่ระบุเท่านั้น เช่น @Roles('owner') — ไม่ใส่ = เข้าได้ทุก role ที่ login แล้ว */
export const Roles = (...roles: Array<'customer' | 'owner'>) => SetMetadata(ROLES_KEY, roles)
