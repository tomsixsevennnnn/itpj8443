import type { AppSettings, Booking, MenuItem } from './types'
import { calculateStaff, toPlan } from './staffing'

/* ------------------------------------------------------------------ *
 * ต้นทุนต่อจาน + ค่าแรงคน — ดู newfeature.md สำหรับที่มาของสูตร
 *   - ต้นทุนเมนู: เจ้าของร้านกรอกราคาทุนต่อจานตรงๆ ไม่คำนวณจากวัตถุดิบ
 *   - ค่าแรง: flat rate ต่อคนต่อตำแหน่ง ยกเว้นเสิร์ฟที่คิดตรงตามจำนวนโต๊ะ
 * ------------------------------------------------------------------ */

/** ค่าเริ่มต้น — แก้ไขได้จริงจากหน้า "ตั้งค่า" ฝั่งร้าน (ค่านี้ใช้เป็นค่าเริ่มต้นของ AppSettings) */
export const DEFAULT_WAGE_CHEF = 1200
export const DEFAULT_WAGE_ASSISTANT = 1000
export const DEFAULT_WAGE_SERVER_PER_TABLE = 100
export const DEFAULT_WAGE_DISHWASHER = 500

type WageRates = Pick<AppSettings, 'wageChef' | 'wageAssistant' | 'wageServerPerTable' | 'wageDishwasher'>

/** ค่าแรงรวมของงาน จากแผนกำลังคน + จำนวนโต๊ะ (เสิร์ฟคิดตามโต๊ะ ไม่ใช่ตามหัวคน) */
export const wageCostFor = (booking: Booking, wage: WageRates): number => {
  const staff = booking.staffActual ?? toPlan(calculateStaff(booking.tables))
  return (
    wage.wageChef * staff.chefs +
    wage.wageAssistant * staff.assistants +
    wage.wageServerPerTable * booking.tables +
    wage.wageDishwasher * staff.dishwashers
  )
}

/** ต้นทุนเมนูรวมของงาน = Σ ราคาทุนต่อจานของเมนูที่ลูกค้าเลือก × จำนวนโต๊ะ (1 จาน/โต๊ะ) */
export const menuCostFor = (booking: Booking, menus: MenuItem[]): number => {
  const costByName = new Map(menus.map(m => [m.name, m.costPrice ?? 0]))
  const perPlate = booking.menus.reduce((sum, name) => sum + (costByName.get(name) ?? 0), 0)
  return perPlate * booking.tables
}

export interface BookingCostSummary {
  menuCost: number
  wageCost: number
  totalCost: number
  profit: number
}

/** สรุปต้นทุน/กำไรของงานหนึ่งงาน — ใช้ทั้งหน้ารายละเอียดการจอง เอกสาร และแดชบอร์ด */
export const bookingCostSummary = (booking: Booking, menus: MenuItem[], wage: WageRates): BookingCostSummary => {
  const menuCost = menuCostFor(booking, menus)
  const wageCost = wageCostFor(booking, wage)
  const totalCost = menuCost + wageCost
  return { menuCost, wageCost, totalCost, profit: booking.totalPrice - totalCost }
}
