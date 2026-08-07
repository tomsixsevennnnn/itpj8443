import { BadRequestException, Injectable } from '@nestjs/common'

/** whitelist โดเมนลิงก์ย่อของ Google Maps เท่านั้น — กัน endpoint นี้ถูกใช้เป็น open redirect resolver ไปยิง URL อื่นที่ไม่เกี่ยวข้อง (SSRF) */
const ALLOWED_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl'])

@Injectable()
export class GeoService {
  /**
   * ตามลิงก์ย่อของ Google Maps (จากปุ่ม "แชร์" ในแอปมือถือ) ฝั่งเซิร์ฟเวอร์แทนฝั่งเบราว์เซอร์
   * เพราะ Google ไม่ส่ง Access-Control-Allow-Origin ให้เว็บอื่น fetch ตรงๆ ได้ (เช็คแล้วด้วย curl)
   */
  async resolveMapsLink(rawUrl: string): Promise<string> {
    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      throw new BadRequestException('ลิงก์ไม่ถูกต้อง')
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new BadRequestException('รองรับเฉพาะลิงก์ย่อจาก Google Maps (maps.app.goo.gl)')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(parsed.toString(), { redirect: 'follow', signal: controller.signal })
      return res.url
    } catch {
      throw new BadRequestException('ตามลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      clearTimeout(timeout)
    }
  }
}
