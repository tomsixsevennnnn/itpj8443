/** namespace ต้องตรงกับ custom claim ที่ Auth0 Action ฝังลง token (ดู docs/auth0-action.md) */
export const AUTH0_ROLE_CLAIM = 'https://pipatphochana-catering.app/role'

export type AppRole = 'customer' | 'owner'

/** connection ที่ Auth0 Application เปิดไว้ — ใช้บังคับ loginWithRedirect ให้ตรงบทบาท */
export const AUTH0_CONNECTION = {
  customer: 'google-oauth2',
  owner: 'Username-Password-Authentication',
} as const

export const roleFromAuth0User = (user: Record<string, unknown> | undefined): AppRole =>
  user?.[AUTH0_ROLE_CLAIM] === 'owner' ? 'owner' : 'customer'
