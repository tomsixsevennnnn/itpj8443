import { useEffect, useRef, useState } from 'react'
import type { AppSettings } from '../../types'

/**
 * state ของฟอร์มตั้งค่า (หน้าตั้งค่าร้าน/เนื้อหาหน้าแรก) ที่ sync ตาม settings ล่าสุดจาก backend อยู่เสมอ:
 *  - ยังไม่ได้แก้อะไรค้างไว้ → ตามค่าล่าสุดทุกครั้ง (คนอื่นแก้จากเครื่องอื่น/polling/SSE)
 *  - กำลังบันทึกอยู่ (saving) แล้ว settings เปลี่ยน → ตามค่าล่าสุดเสมอ ทั้งกรณีบันทึกสำเร็จ (ได้ version ใหม่ ไม่งั้นบันทึกรอบถัดไป
 *    ส่ง version เก่าไปแล้วชน 409 ทั้งที่ไม่มีใครแก้) และกรณี 409 (App โหลดค่าล่าสุดมาแทนที่แล้ว ฟอร์มต้องตามด้วย
 *    ไม่งั้นค้าง version เก่า กดบันทึกซ้ำเท่าไรก็ชนเหมือนเดิม)
 *  - แก้ค้างไว้แต่ไม่ได้กำลังบันทึก → คงสิ่งที่พิมพ์ไว้ ไม่ทับกลางคัน
 */
export function useSettingsForm(settings: AppSettings, saving: boolean) {
  const [form, setForm] = useState<AppSettings>(settings)
  const prevSettingsRef = useRef(settings)
  const savingRef = useRef(saving)
  savingRef.current = saving

  useEffect(() => {
    const prevSettings = prevSettingsRef.current
    prevSettingsRef.current = settings
    setForm(f => (savingRef.current || JSON.stringify(f) === JSON.stringify(prevSettings) ? settings : f))
  }, [settings])

  return [form, setForm] as const
}
