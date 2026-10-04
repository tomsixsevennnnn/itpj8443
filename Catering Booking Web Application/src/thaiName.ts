const TITLE_PATTERN = /^(นางสาว|น\.ส\.|นาง|นาย|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|mr|mrs|ms|miss)\s*\.?\s*/iu

/**
 * แยก "ชื่อ-นามสกุล" ที่พิมพ์เป็นข้อความเดียว (เช่น "นายพิพัฒน์ โภชนา") เป็น { ชื่อ, นามสกุล } โดยตัดคำนำหน้าออก —
 * ใช้เติมช่องชื่อ/นามสกุลของพร้อมเพย์จากชื่อบัญชีธนาคาร (คำแรกเป็นชื่อ ที่เหลือทั้งหมดเป็นนามสกุล)
 */
export const splitName = (full: string): { first: string; last: string } => {
  const tokens = full.trim().replace(TITLE_PATTERN, '').split(/\s+/).filter(Boolean)
  return { first: tokens[0] ?? '', last: tokens.slice(1).join(' ') }
}

/** รวมชื่อ + นามสกุลเป็นข้อความเดียว (ตัดช่องว่างหัวท้าย) */
export const joinName = (first: string, last: string): string => [first.trim(), last.trim()].filter(Boolean).join(' ')
