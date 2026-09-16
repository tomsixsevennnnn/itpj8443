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
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
    })
  }

  validate(payload: Record<string, unknown>) {
    return payload
  }
}
