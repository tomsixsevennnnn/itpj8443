import { describe, expect, it } from 'vitest'
import { toBackendSettingsPatch } from './api'
import type { AppSettings } from './types'

/** ทดสอบตรงๆ ว่า field ไหนของ AppSettings แม็พไปเป็น field ชื่ออะไรของ backend — ฟังก์ชันนี้แยกออกเป็น
 *  3 กลุ่มย่อย (ลด cognitive complexity) เทสต์นี้ยืนยันว่าแยกแล้วผลลัพธ์ยังครบทุก field เหมือนก่อนแยก */
describe('toBackendSettingsPatch', () => {
  it('patch ว่างเปล่า (ไม่มี version) — ส่งแค่ expectedVersion เป็น 0', () => {
    expect(toBackendSettingsPatch({})).toEqual({ expectedVersion: 0 })
  })

  it('ส่ง version มา — ใช้เป็น expectedVersion', () => {
    expect(toBackendSettingsPatch({ version: 7 })).toEqual({ expectedVersion: 7 })
  })

  it('shopInfo ทุกฟิลด์ — แม็พชื่อ field ตรงกับที่ backend คาดหวัง', () => {
    const shopInfo: AppSettings['shopInfo'] = {
      name: 'ร้าน A', nameEn: 'Shop A', initials: 'A', address: 'ที่อยู่', phone: '0812345678', line: '@a',
      bankName: 'ธนาคาร A', bankAccountNumber: '123', bankAccountName: 'นาย A',
      promptPayQr: 'qr.png', promptPayQrFirstName: 'A', promptPayQrLastName: 'B',
      promptPayId: '0812345678', promptPayFirstName: 'C', promptPayLastName: 'D',
      logo: 'logo.png', loginTagline: 'ยินดีต้อนรับ',
    }
    expect(toBackendSettingsPatch({ shopInfo })).toEqual({
      expectedVersion: 0,
      shopName: 'ร้าน A',
      shopNameEn: 'Shop A',
      shopInitials: 'A',
      shopAddress: 'ที่อยู่',
      shopPhone: '0812345678',
      shopLine: '@a',
      bankName: 'ธนาคาร A',
      bankAccountNumber: '123',
      bankAccountName: 'นาย A',
      promptPayQr: 'qr.png',
      promptPayQrFirstName: 'A',
      promptPayQrLastName: 'B',
      promptPayId: '0812345678',
      promptPayFirstName: 'C',
      promptPayLastName: 'D',
      shopLogo: 'logo.png',
      shopLoginTagline: 'ยินดีต้อนรับ',
    })
  })

  it('การเงิน/ค่าแรง/กำลังคน — แม็พครบทุกฟิลด์', () => {
    const patch: Partial<AppSettings> = {
      depositRate: 0.5,
      deliveryFee: 2000,
      freeDeliveryMinTables: 30,
      metroProvinces: ['กรุงเทพมหานคร'],
      homeProvince: 'นครปฐม',
      brandColor: '#F97316',
      wageChef: 1200,
      wageAssistant: 1000,
      wageServerPerTable: 100,
      wageDishwasher: 500,
      tablesPerServer: 8,
      tablesPerSupport: 20,
      staffRemainderThreshold: 10,
    }
    expect(toBackendSettingsPatch(patch)).toEqual({
      expectedVersion: 0,
      depositRate: 0.5,
      deliveryFee: 2000,
      freeDeliveryMinTables: 30,
      metroProvinces: ['กรุงเทพมหานคร'],
      homeProvince: 'นครปฐม',
      brandColor: '#F97316',
      wageChef: 1200,
      wageAssistant: 1000,
      wageServerPerTable: 100,
      wageDishwasher: 500,
      tablesPerServer: 8,
      tablesPerSupport: 20,
      staffRemainderThreshold: 10,
    })
  })

  it('เวลาจอง/เอกสาร/แคตตาล็อก/พิกัดร้าน/SlipOK — แม็พครบทุกฟิลด์', () => {
    const patch: Partial<AppSettings> = {
      timeSlotHours: { morning: '08:00 - 12:00', noon: '12:00 - 16:00', evening: '17:00 - 21:00' },
      quotationValidDays: 7,
      quotationTerms: ['เงื่อนไข 1'],
      bookingTerms: ['เงื่อนไข 2'],
      categories: [],
      categoryOrder: ['snack'],
      closedDates: ['2026-01-01'],
      shopLocation: { lat: 13.8, lng: 100.06 },
      fuelCostPerKm: 8,
      homeContent: {} as AppSettings['homeContent'],
      slipOkApiKey: 'key1',
      slipOkBranchId: 'branch1',
    }
    expect(toBackendSettingsPatch(patch)).toEqual({
      expectedVersion: 0,
      slotMorningHours: '08:00 - 12:00',
      slotNoonHours: '12:00 - 16:00',
      slotEveningHours: '17:00 - 21:00',
      quotationValidDays: 7,
      quotationTerms: ['เงื่อนไข 1'],
      bookingTerms: ['เงื่อนไข 2'],
      categories: [],
      categoryOrder: ['snack'],
      closedDates: ['2026-01-01'],
      shopLocationLat: 13.8,
      shopLocationLng: 100.06,
      fuelCostPerKm: 8,
      homeContent: {},
      slipOkApiKey: 'key1',
      slipOkBranchId: 'branch1',
    })
  })

  it('ไม่ส่งฟิลด์ไหนมา — ไม่มีฟิลด์นั้นโผล่ใน patch เลย (ไม่ใช่ undefined ค้าง)', () => {
    const result = toBackendSettingsPatch({ depositRate: 0.5 })
    expect(result).not.toHaveProperty('deliveryFee')
    expect(result).not.toHaveProperty('shopName')
    expect(Object.keys(result)).toEqual(['expectedVersion', 'depositRate'])
  })
})
