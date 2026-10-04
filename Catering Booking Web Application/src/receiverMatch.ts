/**
 * เทียบชื่อ/เลขบัญชีที่ owner กรอก กับผู้รับเงินที่ SlipOK เห็นจากสลิป (ถูกย่อ/ปกปิดบางส่วน) — ใช้โชว์ ✓/✗ สดๆ ตอนกรอกในหน้าตั้งค่า
 * ตรรกะเดียวกับฝั่ง backend (backend/src/slip-verify/receiver-match.ts) ที่ใช้ตัดสินจริงตอนลูกค้าแนบสลิป — แก้ที่หนึ่งต้องแก้อีกที่ด้วย
 */

const TITLE_PATTERN = /^(นางสาว|น\.ส\.|นาง|นาย|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|mr|mrs|ms|miss)\s*\.?\s*/iu

const nameTokens = (raw: string): string[] =>
  raw
    .trim()
    .toLowerCase()
    .replace(TITLE_PATTERN, '')
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** ชื่อในสลิปถูกย่อ ("ธนาทร ร") — คำแรกต้องตรงกัน และถ้าทั้งสองฝั่งมีนามสกุล ตัวอักษรแรกของนามสกุลต้องตรงกัน */
export const nameMatches = (expected: string, actual: string): boolean => {
  const e = nameTokens(expected)
  const a = nameTokens(actual)
  if (e.length === 0 || a.length === 0) return false
  if (!(e[0].startsWith(a[0]) || a[0].startsWith(e[0]))) return false
  if (e.length > 1 && a.length > 1) return e[e.length - 1][0] === a[a.length - 1][0]
  return true
}

/** true = ตรง, false = ไม่ตรง, null = เทียบไม่ได้ — ตัว x ในเลขที่ปกปิดตรงกับเลขอะไรก็ได้ */
export const accountMatches = (expected: string, masked: string): boolean | null => {
  const e = expected.replace(/\D/g, '')
  const m = masked.toLowerCase().replace(/[\s-]/g, '')
  if (!e || !m) return null
  if (e.length !== m.length) return null
  for (let i = 0; i < m.length; i++) {
    if (m[i] !== 'x' && m[i] !== e[i]) return false
  }
  return true
}
