import { useEffect, useRef, useState } from 'react'
import type { AppSettings } from '../../types'

/** ผลของการกดบันทึกค่าตั้งค่า — settings = ค่าล่าสุดจาก backend ที่ฟอร์มต้องตามทันที (ค่าที่เพิ่งบันทึกสำเร็จ หรือค่าที่โหลดใหม่
 *  หลังชน 409) ok = บันทึกสำเร็จจริงหรือไม่ (ไม่สำเร็จ = มีข้อความผิดพลาดที่แถบแจ้งเตือนรวมของ App อยู่แล้ว) */
export interface SaveSettingsResult {
  ok: boolean
  settings: AppSettings | null
}

/**
 * state ของฟอร์มตั้งค่า (หน้าตั้งค่าร้าน/เนื้อหาหน้าแรก) ที่ sync ตาม settings ล่าสุดจาก backend:
 *  - ยังไม่ได้แก้อะไรค้างไว้ → ตามค่าล่าสุดทุกครั้ง (คนอื่นแก้จากเครื่องอื่น/polling/SSE)
 *  - แก้ค้างไว้ → คงสิ่งที่พิมพ์ไว้ ไม่ทับกลางคัน (ถ้าระหว่างนั้นมีคนอื่นบันทึกไปก่อน การบันทึกของเราจะชน 409 ตามที่ตั้งใจ)
 *  - หลังกดบันทึก ผู้เรียกต้อง setForm(ค่าล่าสุดที่ได้กลับมา) เองเสมอ ทั้งกรณีสำเร็จ (ได้ version ใหม่) และกรณีชน 409 (ได้ค่า
 *    ล่าสุดที่โหลดใหม่) — ห้ามพึ่งจังหวะ render ว่า settings เปลี่ยนตอนไหน (เคยใช้ธง "กำลังบันทึก" แล้วพลาดเป็นช่วงๆ เพราะ React รวม
 *    การอัปเดต settings กับการปิดธงเข้า render เดียวกัน ฟอร์มเลยค้าง version เก่าแล้วชน 409 ซ้ำทั้งที่ไม่มีใครแก้)
 */
export function useSettingsForm(settings: AppSettings) {
  const [form, setForm] = useState<AppSettings>(settings)
  const prevSettingsRef = useRef(settings)

  useEffect(() => {
    const prevSettings = prevSettingsRef.current
    prevSettingsRef.current = settings
    setForm(f => (JSON.stringify(f) === JSON.stringify(prevSettings) ? settings : f))
  }, [settings])

  return [form, setForm] as const
}
