/**
 * แบ่งหน้าแบบ opt-in — ไม่ส่ง page/limit มาเลย = พฤติกรรมเดิมทุกประการ (คืน array เต็ม) เพราะหน้า
 * Dashboard/Reports ฝั่งเจ้าของร้านยังต้องคำนวณสรุปยอดจากข้อมูลทั้งหมด ยังไม่ได้ย้ายไปทำ aggregation
 * ที่ backend — แค่เปิดทางให้ endpoint ที่ต้องการ (เช่น รายการยาวๆ ในอนาคต) ขอเป็นหน้าได้โดยไม่พังของเดิม
 */
export interface PageArgs {
  skip: number
  take: number
  page: number
  limit: number
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

const DEFAULT_LIMIT = 20

export const pageArgsFor = (page?: number, limit?: number): PageArgs | null => {
  if (page == null && limit == null) return null
  const take = limit ?? DEFAULT_LIMIT
  const currentPage = page ?? 1
  return { skip: (currentPage - 1) * take, take, page: currentPage, limit: take }
}
