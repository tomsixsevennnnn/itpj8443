import { docNumber } from './documents'
import type { Booking } from './types'

export type NotificationKind = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'reminder'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  message: string
  timestamp: string
}

/** ถือว่า "ใหม่" ถ้าเกิดขึ้นภายใน 24 ชม.ที่ผ่านมา — ใช้ตัดสินทั้งป้าย NEW รายรายการ และตัวเลขนับที่ไอคอนกระดิ่ง */
const NEW_WINDOW_MS = 86_400_000

export const isNotificationNew = (item: Pick<NotificationItem, 'timestamp'>): boolean =>
  Date.now() - new Date(item.timestamp).getTime() < NEW_WINDOW_MS

/** สร้างรายการแจ้งเตือนจากใบจองจริงของลูกค้า (ไม่ใช้ mock) — 1 การ์ดต่อสถานะ บวกการ์ดเตือนล่วงหน้าถ้างานจะจัดพรุ่งนี้ */
export const buildNotifications = (bookings: Booking[]): NotificationItem[] => {
  const items: NotificationItem[] = []
  const tomorrowKey = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  for (const booking of bookings) {
    const no = docNumber(booking, 'booking')

    if (booking.status === 'pending') {
      items.push({
        id: `${booking.id}-pending`,
        kind: 'pending',
        title: 'รอการยืนยัน',
        message: `การจองหมายเลข ${no} กำลังรอการยืนยันจากเจ้าของร้าน`,
        timestamp: booking.createdAt,
      })
    } else if (booking.status === 'confirmed') {
      items.push({
        id: `${booking.id}-confirmed`,
        kind: 'confirmed',
        title: 'ยืนยันการจองแล้ว',
        message: `การจองหมายเลข ${no} ได้รับการยืนยัน วันที่ ${booking.date} ${booking.timeSlot}`,
        timestamp: booking.createdAt,
      })
      if (booking.date === tomorrowKey) {
        items.push({
          id: `${booking.id}-reminder`,
          kind: 'reminder',
          title: 'แจ้งเตือนงานพรุ่งนี้',
          message: `อย่าลืม! งานจัดเลี้ยงของคุณ ${no} จะจัดขึ้นพรุ่งนี้ ${booking.timeSlot}`,
          timestamp: new Date().toISOString(),
        })
      }
    } else if (booking.status === 'completed') {
      items.push({
        id: `${booking.id}-completed`,
        kind: 'completed',
        title: 'งานเสร็จสมบูรณ์',
        message: `งานจัดเลี้ยง ${no} เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ`,
        timestamp: booking.createdAt,
      })
    } else if (booking.status === 'cancelled') {
      items.push({
        id: `${booking.id}-cancelled`,
        kind: 'cancelled',
        title: 'การจองถูกยกเลิก',
        message: `การจองหมายเลข ${no} ถูกยกเลิก`,
        timestamp: booking.createdAt,
      })
    }
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/** แปลง timestamp เป็นข้อความเวลาที่ผ่านมาแบบย่อ เช่น "27 นาทีที่แล้ว" */
export const timeAgo = (timestamp: string): string => {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7) return `${days} วันที่แล้ว`

  return new Date(timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const unreadNotificationCount = (bookings: Booking[]): number =>
  buildNotifications(bookings).filter(isNotificationNew).length

/** จำนวนใบจองที่รอยืนยัน — ใช้ badge กระดิ่งฝั่งเจ้าของร้าน */
export const ownerPendingCount = (bookings: Booking[]): number =>
  bookings.filter(b => b.status === 'pending').length
