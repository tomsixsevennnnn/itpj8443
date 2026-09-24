import { Controller, Sse, UseGuards } from '@nestjs/common'
import { interval, map, merge, Observable } from 'rxjs'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RealtimeService } from './realtime.service'

interface SseMessage {
  data: string
}

/** ส่ง heartbeat ทุก 25 วิ กันบาง proxy/load balancer ตัดการเชื่อมต่อที่ไม่มี traffic นานเกินไป (ทั่วไปตัดที่ ~30-60s) */
const HEARTBEAT_MS = 25_000

/** ต้อง login ก่อนถึงเปิด stream ได้ (JwtAuthGuard) แต่ไม่กรองตาม role เพราะ event ไม่มีข้อมูลอ่อนไหวอยู่ในตัวเอง
 *  (ดู RealtimeService) — EventSource ของเบราว์เซอร์ตั้ง Authorization header เองไม่ได้ jwt.strategy.ts จึงรับ
 *  token จาก query string ?access_token= เป็นทางเลือกเพิ่มสำหรับ route นี้โดยเฉพาะ */
@UseGuards(JwtAuthGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(private realtime: RealtimeService) {}

  @Sse('bookings')
  bookingsStream(): Observable<SseMessage> {
    return merge(
      this.realtime.bookingsChanged$.pipe(map((): SseMessage => ({ data: 'changed' }))),
      interval(HEARTBEAT_MS).pipe(map((): SseMessage => ({ data: 'ping' }))),
    )
  }

  /** ช่องรวมของหัวข้ออื่นนอกจาก bookings — ตั้งค่าร้าน/เมนู-แพ็กเกจ/สิทธิ์ผู้ใช้/ประวัติการแก้ไข ส่ง topic name
   *  มาให้ frontend เลือก refetch เฉพาะส่วนที่เกี่ยวข้อง (ดู useAppStream.ts ฝั่ง frontend) */
  @Sse('app')
  appStream(): Observable<SseMessage> {
    return merge(
      this.realtime.appChanged$.pipe(map((topic): SseMessage => ({ data: topic }))),
      interval(HEARTBEAT_MS).pipe(map((): SseMessage => ({ data: 'ping' }))),
    )
  }
}
