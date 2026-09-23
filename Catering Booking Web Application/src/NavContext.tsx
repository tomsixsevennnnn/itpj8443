import { createContext, useContext } from 'react'
import type { Category, Screen, ShopInfo, UserProfile } from './types'

/**
 * ค่า "chrome"/config ระดับแอปที่หลายหน้าจอ/component ต้องใช้ — เดิมส่งเป็น props ผ่านทุกชั้น
 * (App.tsx → แต่ละ screen → Navbar/OwnerLayout/DishTile) ทำให้ทุกไฟล์ต้องรับ-ส่งต่อ props เดิมซ้ำๆ กัน
 * ย้ายมาไว้ context เดียวแทน ไม่กระทบ props ที่เป็นข้อมูล/action เฉพาะหน้า (bookings, packages, onXxx ฯลฯ)
 */
export interface NavContextValue {
  navigate: (s: Screen) => void
  user: UserProfile | null
  shopInfo: ShopInfo
  notifCount: number
  /** คลิกการ์ดแจ้งเตือน (ทั้ง dropdown ฝั่งเจ้าของร้านและหน้าแจ้งเตือนเต็มฝั่งลูกค้า) — พาไปหน้ารายการที่ถูกต้อง
   *  ตาม role แล้วเปิดรายละเอียดใบจองนั้นให้ทันที ไม่ต้องค้นหาเอง */
  openNotificationBooking: (bookingId: string) => void
  /** ประเภทอาหารเรียงตามลำดับที่เจ้าของร้านตั้งไว้แล้ว (AppSettings.categories + categoryOrder) */
  categories: Category[]
  categoryMap: Record<string, Category>
}

const NavContext = createContext<NavContextValue | null>(null)

export const NavProvider = NavContext.Provider

export const useNav = (): NavContextValue => {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav() ต้องถูกเรียกภายใต้ <NavProvider> เท่านั้น')
  return ctx
}
