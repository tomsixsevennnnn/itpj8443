export interface VerifiedIdentity {
  email: string
  emailVerified: boolean
}

/**
 * ถามอีเมลของผู้เรียกจาก Auth0 โดยตรง (`/userinfo` ด้วย access token ของผู้เรียกเอง) — ใช้ตัดสินสิทธิ์ที่ผูกกับอีเมล
 * (คำเชิญเป็นเจ้าของร้าน) เพราะอีเมลที่ frontend ส่งมาใน body ปลอมได้ ส่วนค่านี้มาจาก Auth0 เท่านั้น
 * คืน null ถ้าถามไม่ได้ (ไม่มี token/เครือข่าย/Auth0 ตอบผิดปกติ) — ผู้เรียกต้องถือว่า "ไม่ผ่าน" ไม่ใช่ error
 */
export async function fetchVerifiedIdentity(
  authorization: string | undefined,
  domain: string | undefined = process.env.AUTH0_DOMAIN,
  timeoutMs = 4000,
): Promise<VerifiedIdentity | null> {
  if (!authorization?.startsWith('Bearer ') || !domain) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: authorization },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { email?: unknown; email_verified?: unknown }
    if (typeof data.email !== 'string' || !data.email) return null
    return { email: data.email, emailVerified: data.email_verified === true }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
