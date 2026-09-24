import { Injectable } from '@nestjs/common'
import { Subject } from 'rxjs'

/** หัวข้อที่ไม่ใช่ bookings (มี stream แยกของตัวเองอยู่แล้ว) — รวมกันช่องเดียวเพราะฝั่ง frontend ฟังจากจุดเดียว
 *  ใน App.tsx เป็นหลัก (settings/catalog) ส่วน audit/users ใช้ตอนเปิดหน้านั้นๆ ค้างไว้เท่านั้น */
export type AppChangeTopic = 'settings' | 'catalog' | 'users' | 'audit'

/**
 * ส่งสัญญาณ "มีการเปลี่ยนแปลงข้อมูล" ผ่าน SSE (ดู realtime.controller.ts) ให้ client ที่เปิดหน้าค้างไว้รู้ทันที
 * ว่าต้อง refetch — ตัว event เองไม่ได้พ่วงข้อมูลจริงไปด้วย เพื่อไม่ต้องทำ role-based filtering ซ้ำอีกชุดนอกเหนือ
 * จาก endpoint GET ที่มีอยู่แล้ว แค่กระตุ้นให้ client เรียก endpoint เดิมใหม่
 */
@Injectable()
export class RealtimeService {
  private readonly bookingsChangedSubject = new Subject<void>()
  readonly bookingsChanged$ = this.bookingsChangedSubject.asObservable()

  private readonly appChangedSubject = new Subject<AppChangeTopic>()
  readonly appChanged$ = this.appChangedSubject.asObservable()

  emitBookingsChanged() {
    this.bookingsChangedSubject.next()
  }

  emitAppChanged(topic: AppChangeTopic) {
    this.appChangedSubject.next(topic)
  }
}
