/**
 * ตัด whitespace หน้า/หลังของทุกค่าที่เป็น string ในโครงสร้าง (รวมที่ซ้อนอยู่ใน object/array) แบบ recursive
 * ใช้ตอนสร้าง payload ก่อนบันทึกจริง (ไม่ใช่ตอน onChange ของ input) เพราะถ้า trim ทุกครั้งที่พิมพ์จะพิมพ์คำที่มี
 * เว้นวรรคระหว่างคำไม่ได้ — เว้นวรรคท้ายที่เผลอเพิ่มแล้วกดบันทึกจะกลายเป็น "มีการแก้ไข" ปลอมทั้งที่เนื้อหาจริงเหมือนเดิม
 * ทั้งใน dirty-check และในประวัติการแก้ไข (audit log)
 */
export function deepTrim<T>(value: T): T {
  if (typeof value === 'string') return value.trim() as T
  if (Array.isArray(value)) return value.map(deepTrim) as T
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepTrim(v)])) as T
  }
  return value
}
