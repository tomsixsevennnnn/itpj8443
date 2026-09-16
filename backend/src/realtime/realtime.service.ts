import { Injectable } from '@nestjs/common'
import { Subject } from 'rxjs'

/**
 * ส่งสัญญาณ "มีการเปลี่ยนแปลงรายการจอง" ผ่าน SSE (ดู realtime.controller.ts) ให้ client ที่เปิดหน้าค้างไว้รู้ทันที
 * ว่าต้อง refetch — ตัว event เองไม่ได้พ่วงข้อมูลจองจริงไปด้วย เพื่อไม่ต้องทำ role-based filtering ซ้ำอีกชุดนอกเหนือ
 * จาก GET /bookings ที่มีอยู่แล้ว (bookings.controller.ts) แค่กระตุ้นให้ client เรียก endpoint เดิมใหม่
 */
@Injectable()
export class RealtimeService {
  private readonly bookingsChangedSubject = new Subject<void>()
  readonly bookingsChanged$ = this.bookingsChangedSubject.asObservable()

  emitBookingsChanged() {
    this.bookingsChangedSubject.next()
  }
}
