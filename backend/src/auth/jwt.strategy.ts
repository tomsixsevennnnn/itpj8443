import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { passportJwtSecret } from 'jwks-rsa'
import type { Request } from 'express'

/** verify JWT ที่ Auth0 ออกให้ ด้วย public key จาก JWKS ของ tenant — ไม่ต้องเก็บ secret เอง */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const domain = process.env.AUTH0_DOMAIN
    super({
      // header ก่อนเสมอ (ทุก request ปกติ) — query param ?access_token= เป็น fallback เฉพาะ SSE endpoint
      // (GET /realtime/bookings ดู realtime.controller.ts) ที่ EventSource ของเบราว์เซอร์ตั้ง header เองไม่ได้
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => (typeof req.query?.access_token === 'string' ? req.query.access_token : null),
      ]),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
      passReqToCallback: true,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
    })
  }

  /** header X-Shop-Id = ร้านที่ผู้ใช้กำลังเปิดอยู่ใน request นี้ (ดู resolveShopContext) เป็นแค่ตัวเลือกร้าน
   *  สิทธิ์ owner จริงมาจาก ShopMember ใน DB เสมอ ส่ง header ปลอมไปก็ไม่ได้สิทธิ์เพิ่ม */
  validate(req: Request, payload: Record<string, unknown>) {
    const header = req.headers['x-shop-id']
    return { ...payload, requestedShopId: typeof header === 'string' && header ? header : undefined }
  }
}
