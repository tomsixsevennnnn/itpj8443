/**
 * กฎตรวจ/ทำความสะอาดข้อมูลที่ผู้ใช้กรอก ใช้ร่วมกันทุก DTO — ต้องตรงกับ frontend `src/inputRules.ts`
 * (หน้าจอตัดอักขระตอนพิมพ์เพื่อความสะดวก backend ตรวจซ้ำเพื่อความปลอดภัย เพราะเรียก API ตรงข้ามหน้าจอได้)
 */

/** เพดานของตัวเลขที่ไม่มีเพดานตามธรรมชาติ (จำนวนแขก ราคา ค่าขนส่ง ค่าน้ำมัน วันยืนราคา) */
export const MAX_NUMBER = 50000

type TransformParams = { value: unknown }

/** เก็บเฉพาะตัวเลข (ตัดขีดคั่น ช่องว่าง ตัวอักษรออก) */
export const digitsOnly = ({ value }: TransformParams) => (typeof value === 'string' ? value.replace(/\D/g, '') : value)

/** ชื่อ/ชื่อ-นามสกุลรับเฉพาะตัวอักษร (ไทย/อังกฤษ/ภาษาอื่น รวมสระและวรรณยุกต์) กับช่องว่าง — ตัดตัวเลขและอักษรพิเศษออก
 *  ยุบช่องว่างซ้ำและตัดหัวท้าย */
export const NAME_PATTERN = /^[\p{L}\p{M} ]*$/u
export const NAME_MESSAGE = 'ชื่อต้องเป็นตัวอักษรเท่านั้น (ห้ามตัวเลขหรืออักษรพิเศษ)'
export const lettersOnly = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim() : value

/** เบอร์โทรไทย: ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 (มือถือ 10 หลัก เบอร์บ้านรวมรหัสจังหวัด 9 หลัก) */
export const PHONE_PATTERN = /^0\d{8,9}$/
export const PHONE_MESSAGE = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0'

/** Line ID: ตัวอักษรอังกฤษ ตัวเลข และ . _ - @ เท่านั้น (ว่างได้ — ช่องไม่บังคับ) */
export const LINE_ID_PATTERN = /^[A-Za-z0-9._@-]*$/
export const LINE_ID_MESSAGE = 'Line ID ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และ . _ - @'
export const lineIdClean = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.replace(/[^A-Za-z0-9._@-]/g, '') : value
/** แบบทนทานสำหรับตอนจอง: ตัดอักขระผิดและตัดให้ไม่เกิน 30 ตัว แทนการปฏิเสธ — Line ID ของผู้ใช้เก่าที่กรอกไว้ก่อนมีกฎนี้จะได้ไม่ทำให้จองไม่ได้ */
export const lineIdCleanTruncate = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.replace(/[^A-Za-z0-9._@-]/g, '').slice(0, 30) : value
