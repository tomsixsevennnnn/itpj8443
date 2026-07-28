import type { StaffCalculation, StaffPlan } from './types'

/* ------------------------------------------------------------------ *
 * หลักเกณฑ์การคำนวณจำนวนพนักงาน (คำนวณจากจำนวนโต๊ะที่ลูกค้าจอง)
 *   - พนักงานเสิร์ฟ       1 คน ดูแล 5–8 โต๊ะ
 *   - พ่อครัว             1 คน ต่อ 1 งาน
 *   - ผู้ช่วยพ่อครัว       1 คน ต่อ 20 โต๊ะ
 *   - พนักงานล้างจาน      1 คน ต่อ 20 โต๊ะ
 *   - หารแล้วมีเศษมากกว่า 10 โต๊ะ ให้เพิ่มพนักงานอีก 1 คน
 * ------------------------------------------------------------------ */

/** จำนวนโต๊ะสูงสุดที่พนักงานเสิร์ฟ 1 คนดูแลได้ */
export const TABLES_PER_SERVER_MAX = 8
/** จำนวนโต๊ะต่ำสุดที่พนักงานเสิร์ฟ 1 คนดูแล (จัดเต็มอัตรา) */
export const TABLES_PER_SERVER_MIN = 5
/** ผู้ช่วยพ่อครัว / พนักงานล้างจาน 1 คน ต่อกี่โต๊ะ */
export const TABLES_PER_SUPPORT = 20
/** เศษเกินกี่โต๊ะจึงเพิ่มพนักงานอีก 1 คน */
export const REMAINDER_THRESHOLD = 10

/**
 * คำนวณพนักงานสายสนับสนุน (ผู้ช่วยพ่อครัว / ล้างจาน)
 * หารด้วย 20 โต๊ะ แล้วถ้าเหลือเศษเกิน 10 โต๊ะ ให้เพิ่มอีก 1 คน
 * เช่น 25 โต๊ะ → 1 คน (เศษ 5), 35 โต๊ะ → 2 คน (เศษ 15)
 */
export const supportStaffFor = (tables: number): number => {
  const base = Math.floor(tables / TABLES_PER_SUPPORT)
  const remainder = tables % TABLES_PER_SUPPORT
  return Math.max(1, base + (remainder > REMAINDER_THRESHOLD ? 1 : 0))
}

/**
 * คำนวณพนักงานเสิร์ฟ — ปัดขึ้นเพื่อไม่ให้ใครดูแลเกิน 8 โต๊ะ
 * เช่น 25 โต๊ะ → 4 คน (เฉลี่ยคนละ 6.25 โต๊ะ)
 */
export const serversFor = (tables: number, tablesPerServer = TABLES_PER_SERVER_MAX): number =>
  Math.max(1, Math.ceil(tables / tablesPerServer))

export const sumStaff = (plan: StaffPlan): number =>
  plan.servers + plan.chefs + plan.assistants + plan.dishwashers

/** คำนวณจำนวนพนักงานทั้งหมดจากจำนวนโต๊ะ */
export const calculateStaff = (tables: number): StaffCalculation => {
  const safeTables = Math.max(0, Math.floor(tables))
  const plan: StaffPlan = {
    servers: serversFor(safeTables),
    chefs: 1,
    assistants: supportStaffFor(safeTables),
    dishwashers: supportStaffFor(safeTables),
  }
  return {
    ...plan,
    total: sumStaff(plan),
    // ช่วงพนักงานเสิร์ฟตามเกณฑ์ 5–8 โต๊ะ/คน (ขั้นต่ำ = 8 โต๊ะ/คน, เต็มอัตรา = 5 โต๊ะ/คน)
    serversMin: serversFor(safeTables, TABLES_PER_SERVER_MAX),
    serversMax: serversFor(safeTables, TABLES_PER_SERVER_MIN),
  }
}

export interface StaffRoleMeta {
  key: keyof StaffPlan
  label: string
  icon: string
  rule: string
}

export const STAFF_ROLES: StaffRoleMeta[] = [
  { key: 'servers', label: 'พนักงานเสิร์ฟ', icon: '🧍', rule: '1 คน ดูแล 5–8 โต๊ะ' },
  { key: 'chefs', label: 'พ่อครัว', icon: '👨‍🍳', rule: '1 คน ต่อ 1 งาน' },
  { key: 'assistants', label: 'ผู้ช่วยพ่อครัว', icon: '🥘', rule: '1 คน ต่อ 20 โต๊ะ · เศษเกิน 10 โต๊ะ +1 คน' },
  { key: 'dishwashers', label: 'พนักงานล้างจาน', icon: '🧽', rule: '1 คน ต่อ 20 โต๊ะ · เศษเกิน 10 โต๊ะ +1 คน' },
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
