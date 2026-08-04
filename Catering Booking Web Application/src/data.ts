import type { Category, Package } from './types'

/* ------------------------------------------------------------------ *
 * ประเภทอาหาร (9 หมวด) — ใช้เป็นลำดับ "ข้อ" ของเมนูโต๊ะจีน
 * ------------------------------------------------------------------ */
export const CATEGORIES: Category[] = [
  { id: 'snack', label: 'ของทานเล่น', labelEn: 'Snack', icon: '🍤', gradient: 'from-amber-100 to-orange-200' },
  { id: 'appetizer', label: 'ออเดิร์ฟ', labelEn: 'Appetizer', icon: '🥟', gradient: 'from-rose-100 to-pink-200' },
  { id: 'soup', label: 'ซุป / น้ำแกง', labelEn: 'Soup', icon: '🍜', gradient: 'from-orange-100 to-amber-200' },
  { id: 'salad', label: 'ยำ / สลัด', labelEn: 'Salad', icon: '🥗', gradient: 'from-lime-100 to-green-200' },
  { id: 'main', label: 'จานหลักเนื้อสัตว์', labelEn: 'Main Dish', icon: '🍖', gradient: 'from-red-100 to-rose-200' },
  { id: 'fish', label: 'เมนูปลา', labelEn: 'Fish', icon: '🐟', gradient: 'from-sky-100 to-blue-200' },
  { id: 'rice-noodle', label: 'ข้าว / เส้น', labelEn: 'Rice & Noodle', icon: '🍚', gradient: 'from-yellow-100 to-amber-200' },
  { id: 'hotpot', label: 'ต้ม / หม้อไฟ', labelEn: 'Hot Pot / Stew', icon: '🍲', gradient: 'from-orange-100 to-red-200' },
  { id: 'dessert', label: 'ของหวาน', labelEn: 'Dessert', icon: '🍮', gradient: 'from-fuchsia-100 to-purple-200' },
]

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
)

/** ลำดับประเภทอาหารเริ่มต้น — ใช้เป็นค่าเริ่มต้นของ AppSettings.categoryOrder */
export const DEFAULT_CATEGORY_ORDER: string[] = CATEGORIES.map(c => c.id)

/** เรียง CATEGORIES ตามลำดับที่เจ้าของร้านตั้งไว้ — id ที่ตกหล่นจาก order (เช่น เพิ่มประเภทใหม่ในโค้ดทีหลัง) จะต่อท้ายให้ */
export const orderedCategories = (order: string[]): Category[] => {
  const known = order.map(id => CATEGORY_MAP[id]).filter((c): c is Category => c != null)
  const missing = CATEGORIES.filter(c => !order.includes(c.id))
  return [...known, ...missing]
}

/** ข้อที่ลูกค้าต้องเลือกเอง (choose > 0) */
export const requiredCourses = (pkg: Package) => pkg.courses.filter(c => c.choose > 0)

/** ข้อที่รวมมาให้ในแพ็กเกจแล้ว (choose === 0) */
export const includedItems = (pkg: Package) =>
  pkg.courses.filter(c => c.choose === 0).flatMap(c => c.items)
