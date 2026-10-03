import { useEffect, useRef, useState } from 'react'
import { routeDistanceKm, zoneFor } from './geo'
import type { EventLocation, ShopLocation } from './types'

interface LocationSettings {
  homeProvince: string
  metroProvinces: string[]
  shopLocation: ShopLocation
}

/**
 * ทำให้โซน/ระยะทางของสถานที่จัดงานที่ลูกค้าเลือกไว้แล้ว ตามค่าตั้งค่าล่าสุดของร้านเสมอ — zone/distanceKm ถูกคำนวณและเก็บไว้ตอน
 * ลูกค้ากดเลือกสถานที่ ถ้าระหว่างที่ลูกค้าค้างอยู่ในขั้นตอนจอง owner แก้ตำแหน่งร้าน/จังหวัดของร้าน/จังหวัดปริมณฑล ค่าที่เก็บไว้จะ
 * เก่า ทำให้หน้าสรุปโชว์ค่าขนส่งไม่ตรงกับที่ backend คิดจริงตอนจอง (backend คำนวณใหม่จากค่าล่าสุดทุกครั้ง)
 *  - โซนคำนวณใหม่ทันที, นอกพื้นที่ (outside) ขอระยะทางถนนจริงใหม่จากตำแหน่งร้านปัจจุบัน
 *  - ดึงระยะทางไม่สำเร็จ = คงค่าเดิมไว้ (ไม่ล้างทิ้งจนค่าขนส่งกลายเป็น 0)
 * คืน true ระหว่างกำลังคำนวณใหม่ — หน้าสรุปใช้ล็อกปุ่มยืนยันกันจองด้วยยอดที่กำลังจะเปลี่ยน
 */
export function useLocationSync(
  location: EventLocation | null,
  settings: LocationSettings,
  enabled: boolean,
  onChange: (updated: EventLocation) => void,
): boolean {
  const [recalculating, setRecalculating] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // ค่าตั้งค่าที่ใช้คำนวณรอบก่อน — ถ้าค่าตั้งค่าไม่เปลี่ยนและสถานที่เพิ่งถูกเลือกมาพร้อมโซน/ระยะทางครบ (SelectLocation คำนวณมาแล้ว)
  // ไม่ต้องคำนวณซ้ำ ไม่งั้นยิง routing ซ้ำทุกครั้งที่เลือกสถานที่
  const lastSettingsKeyRef = useRef<string | null>(null)

  const { homeProvince, metroProvinces, shopLocation } = settings
  const settingsKey = `${homeProvince}|${metroProvinces.join(',')}|${shopLocation.lat},${shopLocation.lng}`

  useEffect(() => {
    if (!enabled || !location) {
      setRecalculating(false)
      return
    }
    const settingsChanged = lastSettingsKeyRef.current !== null && lastSettingsKeyRef.current !== settingsKey
    lastSettingsKeyRef.current = settingsKey

    const zone = zoneFor(location.province, location.address, metroProvinces, homeProvince)
    if (zone !== 'outside') {
      setRecalculating(false)
      if (location.zone !== zone || location.distanceKm !== undefined) {
        onChangeRef.current({ ...location, zone, distanceKm: undefined })
      }
      return
    }

    const alreadyCurrent = location.zone === 'outside' && location.distanceKm != null
    if (alreadyCurrent && !settingsChanged) {
      setRecalculating(false)
      return
    }

    const ctrl = new AbortController()
    setRecalculating(true)
    routeDistanceKm(shopLocation, location, ctrl.signal)
      .then((km) => {
        if (location.zone !== 'outside' || location.distanceKm == null || Math.abs(location.distanceKm - km) > 0.05) {
          onChangeRef.current({ ...location, zone, distanceKm: km })
        }
      })
      .catch(() => {
        // ดึงระยะทางไม่สำเร็จ (หรือถูกยกเลิก) — คงค่าเดิม ไม่ล้างทิ้ง
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setRecalculating(false)
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, location?.lat, location?.lng, location?.province, location?.address, settingsKey])

  return recalculating
}
