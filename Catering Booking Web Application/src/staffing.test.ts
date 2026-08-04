import { describe, expect, it } from 'vitest'
import { calculateStaff, isSamePlan, serversFor, sumStaff, supportStaffFor } from './staffing'

describe('supportStaffFor', () => {
  it('ปัดขึ้น 1 คนเมื่อเศษเกิน 10 โต๊ะ', () => {
    expect(supportStaffFor(25)).toBe(1) // เศษ 5 ไม่เกิน 10
    expect(supportStaffFor(35)).toBe(2) // เศษ 15 เกิน 10 -> +1
  })

  it('อย่างน้อย 1 คนเสมอแม้ 0 โต๊ะ', () => {
    expect(supportStaffFor(0)).toBe(1)
  })
})

describe('serversFor', () => {
  it('1 คนดูแลได้ไม่เกิน 8 โต๊ะ', () => {
    expect(serversFor(25)).toBe(4) // ceil(25/8)
    expect(serversFor(8)).toBe(1)
    expect(serversFor(9)).toBe(2)
  })
})

describe('calculateStaff', () => {
  it('คำนวณครบทุกตำแหน่งสำหรับ 25 โต๊ะ', () => {
    const plan = calculateStaff(25)
    expect(plan.servers).toBe(4)
    expect(plan.chefs).toBe(1)
    expect(plan.assistants).toBe(1)
    expect(plan.dishwashers).toBe(1)
    expect(plan.total).toBe(7)
  })

  it('มีอย่างน้อยพ่อครัว 1 คนแม้ 0 โต๊ะ', () => {
    const plan = calculateStaff(0)
    expect(plan.chefs).toBe(1)
    expect(plan.servers).toBe(1)
  })

  it('งานใหญ่ 500 โต๊ะ', () => {
    const plan = calculateStaff(500)
    expect(plan.servers).toBe(63) // ceil(500/8)
    expect(plan.assistants).toBe(25) // 500/20 พอดี ไม่มีเศษ
    expect(plan.dishwashers).toBe(25)
  })
})

describe('sumStaff / isSamePlan', () => {
  it('รวมจำนวนพนักงานทุกตำแหน่ง', () => {
    expect(sumStaff({ servers: 2, chefs: 1, assistants: 1, dishwashers: 1 })).toBe(5)
  })

  it('เทียบแผนพนักงานสองชุด', () => {
    const a = { servers: 2, chefs: 1, assistants: 1, dishwashers: 1 }
    const b = { ...a }
    const c = { ...a, servers: 3 }
    expect(isSamePlan(a, b)).toBe(true)
    expect(isSamePlan(a, c)).toBe(false)
  })
})
