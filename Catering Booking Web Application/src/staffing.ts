import type { StaffCalculation, StaffPlan } from './types'

/* ------------------------------------------------------------------ *
 * หลักเกณฑ์การคำนวณจำนวนพนักงาน (คำนวณจากจำนวนโต๊ะที่ลูกค้าจอง)
 *   - พนักงานเสิร์ฟ       1 คน ต่อ 8 โต๊ะ
 *   - พ่อครัว             1 คน ต่อ 1 งาน
 *   - ผู้ช่วยพ่อครัว       1 คน ต่อ 20 โต๊ะ
 *   - พนักงานล้างจาน      1 คน ต่อ 20 โต๊ะ
 *   - หารแล้วมีเศษมากกว่า 10 โต๊ะ ให้เพิ่มพนักงานอีก 1 คน
 * ------------------------------------------------------------------ */

/** ค่าเริ่มต้น (ก่อนเจ้าของร้านแก้ไข) — พนักงานเสิร์ฟ 1 คน ต่อกี่โต๊ะ */
export const TABLES_PER_SERVER = 8
/** ค่าเริ่มต้น — ผู้ช่วยพ่อครัว / พนักงานล้างจาน 1 คน ต่อกี่โต๊ะ */
export const TABLES_PER_SUPPORT = 20
/** ค่าเริ่มต้น — เศษเกินกี่โต๊ะจึงเพิ่มพนักงานอีก 1 คน */
export const REMAINDER_THRESHOLD = 10

/** สัดส่วนคำนวณพนักงาน — เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" (AppSettings) */
export interface StaffRatios {
  tablesPerServer: number
  tablesPerSupport: number
  staffRemainderThreshold: number
}

export const DEFAULT_STAFF_RATIOS: StaffRatios = {
  tablesPerServer: TABLES_PER_SERVER,
  tablesPerSupport: TABLES_PER_SUPPORT,
  staffRemainderThreshold: REMAINDER_THRESHOLD,
}

/**
 * คำนวณพนักงานสายสนับสนุน (ผู้ช่วยพ่อครัว / ล้างจาน)
 * หารด้วยจำนวนโต๊ะ/คน แล้วถ้าเหลือเศษเกิน threshold ให้เพิ่มอีก 1 คน
 * ค่าเริ่มต้น: หาร 20 โต๊ะ เศษเกิน 10 โต๊ะ +1 คน เช่น 25 โต๊ะ → 1 คน (เศษ 5), 35 โต๊ะ → 2 คน (เศษ 15)
 */
export const supportStaffFor = (
  tables: number,
  tablesPerSupport: number = TABLES_PER_SUPPORT,
  remainderThreshold: number = REMAINDER_THRESHOLD,
): number => {
  const base = Math.floor(tables / tablesPerSupport)
  const remainder = tables % tablesPerSupport
  return Math.max(1, base + (remainder > remainderThreshold ? 1 : 0))
}

/**
 * คำนวณพนักงานเสิร์ฟ — ปัดขึ้นเพื่อไม่ให้ใครดูแลเกินสัดส่วนที่ตั้งไว้
 * ค่าเริ่มต้น: 1 คน ต่อ 8 โต๊ะ เช่น 25 โต๊ะ → 4 คน (เฉลี่ยคนละ 6.25 โต๊ะ)
 */
export const serversFor = (tables: number, tablesPerServer: number = TABLES_PER_SERVER): number =>
  Math.max(1, Math.ceil(tables / tablesPerServer))

export const sumStaff = (plan: StaffPlan): number =>
  plan.servers + plan.chefs + plan.assistants + plan.dishwashers

/** คำนวณจำนวนพนักงานทั้งหมดจากจำนวนโต๊ะ — ไม่ส่ง ratios มา = ใช้ค่าเริ่มต้น (กันโค้ด/เทสต์เก่าพัง) */
export const calculateStaff = (tables: number, ratios: StaffRatios = DEFAULT_STAFF_RATIOS): StaffCalculation => {
  const safeTables = Math.max(0, Math.floor(tables))
  const plan: StaffPlan = {
    servers: serversFor(safeTables, ratios.tablesPerServer),
    chefs: 1,
    assistants: supportStaffFor(safeTables, ratios.tablesPerSupport, ratios.staffRemainderThreshold),
    dishwashers: supportStaffFor(safeTables, ratios.tablesPerSupport, ratios.staffRemainderThreshold),
  }
  return {
    ...plan,
    total: sumStaff(plan),
  }
}

export interface StaffRoleMeta {
  key: keyof StaffPlan
  label: string
  icon: string
  rule: string
}

/** รายละเอียดแต่ละตำแหน่งสำหรับแสดงผล — rule เป็นข้อความอธิบายสัดส่วนปัจจุบัน (เปลี่ยนตาม ratios ที่ตั้งค่าไว้) */
export const staffRoles = (ratios: StaffRatios = DEFAULT_STAFF_RATIOS): StaffRoleMeta[] => [
  { key: 'servers', label: 'พนักงานเสิร์ฟ', icon: '🧍', rule: `1 คน ต่อ ${ratios.tablesPerServer} โต๊ะ` },
  { key: 'chefs', label: 'พ่อครัว', icon: '👨‍🍳', rule: '1 คน ต่อ 1 งาน' },
  {
    key: 'assistants',
    label: 'ผู้ช่วยพ่อครัว',
    icon: '🥘',
    rule: `1 คน ต่อ ${ratios.tablesPerSupport} โต๊ะ · เศษเกิน ${ratios.staffRemainderThreshold} โต๊ะ +1 คน`,
  },
  {
    key: 'dishwashers',
    label: 'พนักงานล้างจาน',
    icon: '🧽',
    rule: `1 คน ต่อ ${ratios.tablesPerSupport} โต๊ะ · เศษเกิน ${ratios.staffRemainderThreshold} โต๊ะ +1 คน`,
  },
]

export const toPlan = (calc: StaffCalculation): StaffPlan => ({
  servers: calc.servers,
  chefs: calc.chefs,
  assistants: calc.assistants,
  dishwashers: calc.dishwashers,
})

export const isSamePlan = (a: StaffPlan, b: StaffPlan): boolean =>
  a.servers === b.servers &&
  a.chefs === b.chefs &&
  a.assistants === b.assistants &&
  a.dishwashers === b.dishwashers
