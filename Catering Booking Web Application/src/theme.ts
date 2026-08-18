/**
 * ระบบสีแบรนด์แบบ runtime — เจ้าของร้านเลือกสีเดียว (hex) แล้วทั้งแอปเปลี่ยนสีตามทันที
 * โดยไม่ต้องแก้ class ทุกไฟล์ เพราะ Tailwind v4 คอมไพล์ utility สีเป็น `var(--color-orange-500)` ฯลฯ
 * (ตรวจสอบแล้วจาก build output จริง) — แค่ set custom property เหล่านี้ทับที่ :root ก็พอ
 * amber ก็ set ตามไปด้วยให้เป็นสีเดียวกัน (ใช้ในกราเดียนต์คู่กับ orange เช่นปุ่ม CTA) กันสีเพี้ยนไม่เข้าธีม
 */

export const DEFAULT_BRAND_COLOR = '#F97316'

/** ระดับความสว่าง (HSL lightness %) เป้าหมายของแต่ละ shade — เลียนแบบเส้นโค้งสีโทนอุ่นของ Tailwind default */
const LIGHTNESS_CURVE: Record<string, number> = {
  '50': 97,
  '100': 94,
  '200': 87,
  '300': 77,
  '400': 66,
  '500': 57,
  '600': 48,
  '700': 40,
  '800': 33,
  '900': 27,
}

/** ลดความอิ่มสีลงที่ปลายสเกล (อ่อนมาก/เข้มมาก) ให้ดูเป็นธรรมชาติ ไม่ใช่ neon ตลอดสเกล */
const SATURATION_FACTOR: Record<string, number> = {
  '50': 0.55,
  '100': 0.65,
  '200': 0.8,
  '300': 0.9,
  '400': 0.97,
  '500': 1,
  '600': 1,
  '700': 0.95,
  '800': 0.88,
  '900': 0.8,
}

const SHADE_STEPS = Object.keys(LIGHTNESS_CURVE)

interface Hsl {
  h: number
  s: number
  l: number
}

const hexToHsl = (hex: string): Hsl | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const r = parseInt(match[1].slice(0, 2), 16) / 255
  const g = parseInt(match[1].slice(2, 4), 16) / 255
  const b = parseInt(match[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  return { h: h * 60, s: s * 100, l: l * 100 }
}

const hslToHex = (h: number, s: number, l: number): string => {
  const sn = Math.max(0, Math.min(100, s)) / 100
  const ln = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** สร้างสเกลสี 50–900 จาก hex เดียว — คืน null ถ้า hex ไม่ถูกรูปแบบ (กันตั้งค่าพังทั้งแอป) */
export const generateShadeScale = (hex: string): Record<string, string> | null => {
  const hsl = hexToHsl(hex)
  if (!hsl) return null
  const scale: Record<string, string> = {}
  for (const step of SHADE_STEPS) {
    const l = LIGHTNESS_CURVE[step]
    const s = Math.min(100, hsl.s * SATURATION_FACTOR[step])
    scale[step] = hslToHex(hsl.h, s, l)
  }
  return scale
}

const THEME_ROOT_STYLE = () => document.documentElement.style

/**
 * ทาสีแบรนด์ทับ CSS variable ของ Tailwind ที่ :root — ถ้า brandColor เป็นค่า default เป๊ะ ไม่ต้อง override
 * อะไรเลย (ลบ property ที่เคย set ไว้ถ้ามี) กันสีเริ่มต้นเพี้ยนจากของจริงแม้แต่นิดเดียวจาก HSL ที่เป็นการประมาณ
 */
export const applyBrandTheme = (hex: string): void => {
  const root = THEME_ROOT_STYLE()
  if (hex.toLowerCase() === DEFAULT_BRAND_COLOR.toLowerCase()) {
    for (const step of SHADE_STEPS) {
      root.removeProperty(`--color-orange-${step}`)
      root.removeProperty(`--color-amber-${step}`)
    }
    return
  }
  const scale = generateShadeScale(hex)
  if (!scale) return
  for (const step of SHADE_STEPS) {
    root.setProperty(`--color-orange-${step}`, scale[step])
    root.setProperty(`--color-amber-${step}`, scale[step])
  }
}
