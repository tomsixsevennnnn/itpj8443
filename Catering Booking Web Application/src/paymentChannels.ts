import type { BankAccount, PromptPayAccount, ShopInfo } from './types'

/** เลขบัญชี/เลขพร้อมเพย์กรอกได้เฉพาะตัวเลข — ตัดอักขระอื่น (ขีดคั่น ช่องว่าง ตัวอักษร) ออกทันทีที่พิมพ์/วาง */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '')

/** ชื่อบัญชี/ชื่อ-นามสกุลกรอกได้เฉพาะตัวอักษร (ไทย/อังกฤษ/ภาษาอื่น รวมสระและวรรณยุกต์) กับช่องว่าง — ตัดตัวเลขและอักษรพิเศษออกทันทีที่พิมพ์/วาง
 *  (ไม่ trim ระหว่างพิมพ์ เพราะต้องพิมพ์เว้นวรรคระหว่างคำได้ — backend จัดช่องว่างซ้ำ/หัวท้ายให้ตอนบันทึก) */
export const lettersOnly = (value: string): string => value.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s{2,}/g, ' ')

/** จำนวนสูงสุดของบัญชีเพิ่มเติมแต่ละชนิด (ธนาคาร/พร้อมเพย์) — ต้องตรงกับ MAX_EXTRA_PAYMENT_ACCOUNTS ฝั่ง backend (update-settings.dto.ts) */
export const MAX_EXTRA_PAYMENT_ACCOUNTS = 8

type PaymentInfo = Pick<
  ShopInfo,
  | 'bankName'
  | 'bankAccountNumber'
  | 'bankAccountName'
  | 'promptPayId'
  | 'promptPayFirstName'
  | 'promptPayLastName'
  | 'extraBankAccounts'
  | 'extraPromptPays'
>

/**
 * บัญชีธนาคารทั้งหมดของร้านที่ "ใช้โอนได้จริง" (มีเลขบัญชี): บัญชีหลักก่อน ตามด้วยบัญชีเพิ่มเติม — ธนาคารเดียวกันหลายบัญชีคนละชื่อ
 * หรือหลายธนาคาร (ตามที่ SlipOK ผูกได้) แสดงให้ลูกค้าเห็นทุกบัญชี ไม่ได้ตัดตัวซ้ำ
 */
export const bankAccountsOf = (info: PaymentInfo): BankAccount[] => {
  const primary: BankAccount[] = info.bankAccountNumber.trim()
    ? [{ bankName: info.bankName, accountNumber: info.bankAccountNumber, accountName: info.bankAccountName }]
    : []
  const extras = (info.extraBankAccounts ?? []).filter(a => a.accountNumber.trim() !== '')
  return [...primary, ...extras]
}

/** พร้อมเพย์ทั้งหมดของร้านที่ใช้ได้จริง (มีเลขพร้อมเพย์): รายการหลักก่อน ตามด้วยรายการเพิ่มเติม */
export const promptPaysOf = (info: PaymentInfo): PromptPayAccount[] => {
  const primary: PromptPayAccount[] = info.promptPayId.trim()
    ? [{ id: info.promptPayId, firstName: info.promptPayFirstName, lastName: info.promptPayLastName }]
    : []
  const extras = (info.extraPromptPays ?? []).filter(a => a.id.trim() !== '')
  return [...primary, ...extras]
}

/** ร้านมีช่องทางโอนอย่างน้อย 1 ช่องทางหรือไม่ (ลูกค้าจะเห็นอะไรให้โอน) */
export const hasPaymentChannel = (info: PaymentInfo): boolean => bankAccountsOf(info).length > 0 || promptPaysOf(info).length > 0

/** ช่องทางโอน 1 ช่องทางที่ลูกค้าเลือกได้ตอนแนบสลิป — key ต้องตรงกับที่ backend สร้าง (settings.service.ts paymentChannels):
 *  "bank:<เลขบัญชีเฉพาะตัวเลข>" หรือ "pp:<เลขพร้อมเพย์เฉพาะตัวเลข>" (ต้องมีตัวเลข 4 หลักขึ้นไป) */
export const bankChannelKey = (accountNumber: string): string | null => {
  const digits = accountNumber.replace(/\D/g, '')
  return digits.length >= 4 ? `bank:${digits}` : null
}

export const promptPayChannelKey = (id: string): string | null => {
  const digits = id.replace(/\D/g, '')
  return digits.length >= 4 ? `pp:${digits}` : null
}

/** key ของช่องทางทั้งหมดที่ลูกค้าเลือกได้ (บัญชีธนาคาร + พร้อมเพย์ ตามลำดับที่แสดง) — ตัดช่องทางที่เลขไม่พอสร้าง key ทิ้ง */
export const channelKeysOf = (info: PaymentInfo): string[] =>
  [...bankAccountsOf(info).map(b => bankChannelKey(b.accountNumber)), ...promptPaysOf(info).map(p => promptPayChannelKey(p.id))].filter(
    (k): k is string => k !== null,
  )
