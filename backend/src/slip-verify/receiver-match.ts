/**
 * เทียบ "ผู้รับเงิน" ที่ SlipOK อ่านได้จากสลิป กับบัญชีรับเงินที่ owner ตั้งไว้ในหน้าตั้งค่าการเงินของร้านตัวเอง —
 * เป็นการตรวจซ้ำชั้นที่สองฝั่งระบบเรา (SlipOK เองเช็คกับบัญชีที่ผูกกับ Branch ID ในแดชบอร์ดของ SlipOK อยู่แล้ว
 * และ API ของ SlipOK ไม่เปิดให้จัดการบัญชีผ่านโค้ด) กันเคสที่ตั้งบัญชีใน SlipOK ไว้ไม่ตรงกับที่ร้านบอกลูกค้าให้โอน
 *
 * รองรับทุกกรณีที่ SlipOK ให้ผูกได้: หลายบัญชีธนาคาร (ธนาคารเดียวกันคนละชื่อ/คนละเลข หรือคนละธนาคาร) และพร้อมเพย์หลายรายการ
 * — เทียบแบบ "ต่อบัญชี" (ชื่อกับเลขต้องเป็นของบัญชีเดียวกัน ไม่ข้ามบัญชี) ผู้รับตรงกับบัญชีใดบัญชีหนึ่งก็ผ่าน
 *
 * ข้อมูลจาก SlipOK ถูกปกปิด/ย่อ (ชื่อผู้รับแบบ "ธนาทร ร" เลขบัญชีแบบ "xxx-x-x3109-x") จึงเทียบแบบยืดหยุ่น และ "เทียบไม่ได้"
 * (ไม่มีข้อมูลพอ) ไม่นับเป็นไม่ตรง — ไม่ปฏิเสธสลิปที่ผ่านการตรวจของ SlipOK แล้วด้วยเหตุที่เราเองยืนยันไม่ได้
 */

/** ผู้รับเงินในสลิป ตามที่ SlipOK ส่งกลับมา (ฟิลด์ที่ไม่มีเป็นสตริงว่าง) */
export interface SlipReceiver {
  displayName: string
  name: string
  /** เลขบัญชีที่ถูกปกปิดบางส่วน เช่น "xxx-x-x3109-x" */
  account: string
  /** พร้อมเพย์ที่ถูกปกปิดบางส่วน เช่น "086xxx0000" */
  proxy: string
  /** รหัสธนาคารผู้รับ เช่น "004" */
  bankCode: string
}

/** บัญชีรับเงิน 1 บัญชีที่ owner ตั้งไว้ (บัญชีธนาคารหรือพร้อมเพย์) — names/accounts ว่างได้ถ้า owner ไม่ได้กรอกส่วนนั้น */
export interface ExpectedChannel {
  names: string[]
  accounts: string[]
  /** รหัสช่องทางที่ลูกค้าเลือกได้ ("bank:<เลข>" / "pp:<เลข>") และข้อความแสดงผล — ไม่มี = บัญชีที่กรอกแค่ชื่อ ไม่มีเลขให้ลูกค้าเลือก */
  key?: string
  label?: string
}

/** บัญชีรับเงินทั้งหมดของร้าน (หลักและเพิ่มเติม ทั้งธนาคารและพร้อมเพย์) */
export interface ExpectedReceiver {
  channels: ExpectedChannel[]
}

export interface ReceiverMatchResult {
  /** false = ไม่มีบัญชีที่ตั้งไว้ให้เทียบเลข หรือเทียบอะไรไม่ได้สักอย่าง */
  checked: boolean
  /** true = ไม่พบว่าไม่ตรง (ตรงกับบัญชีใดบัญชีหนึ่ง หรือเทียบไม่ได้) */
  ok: boolean
  reasons: string[]
}

const TITLE_PATTERN = /^(นางสาว|น\.ส\.|นาง|นาย|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|mr|mrs|ms|miss)\s*\.?\s*/iu

/** ชื่อแบบเทียบกันได้: ตัดคำนำหน้า/จุด/ช่องว่างซ้ำ ตัวพิมพ์เล็ก แล้วแยกเป็นคำ */
const nameTokens = (raw: string): string[] =>
  raw
    .trim()
    .toLowerCase()
    .replace(TITLE_PATTERN, '')
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** ชื่อในสลิปถูกย่อ ("ธนาทร ร") — คำแรกต้องตรงกัน (ขึ้นต้นด้วยกันได้) และถ้าทั้งสองฝั่งมีนามสกุล ตัวอักษรแรกของนามสกุลต้องตรงกัน */
export const nameMatches = (expected: string, actual: string): boolean => {
  const e = nameTokens(expected)
  const a = nameTokens(actual)
  if (e.length === 0 || a.length === 0) return false
  if (!(e[0].startsWith(a[0]) || a[0].startsWith(e[0]))) return false
  if (e.length > 1 && a.length > 1) return e[e.length - 1][0] === a[a.length - 1][0]
  return true
}

/** true = ตรง, false = ไม่ตรง, null = เทียบไม่ได้ (ความยาวต่างกันจนจับคู่ตำแหน่งไม่ได้ หรือไม่มีข้อมูล) — ตัว x ในเลขที่ปกปิดตรงกับเลขอะไรก็ได้ */
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

export type ChannelStatus = 'match' | 'mismatch' | 'unknown'

/** เทียบผู้รับกับบัญชีเดียว: ส่วนไหนเทียบได้ต้องตรงทั้งหมด (ทั้งชื่อและเลข) เทียบอะไรไม่ได้เลย = unknown */
export function evaluateChannel(receiver: SlipReceiver, channel: ExpectedChannel): { status: ChannelStatus; reasons: string[] } {
  const reasons: string[] = []
  let checkable = false

  const names = channel.names.map((n) => n.trim()).filter(Boolean)
  const actualNames = [receiver.displayName, receiver.name].map((n) => n.trim()).filter(Boolean)
  if (names.length > 0 && actualNames.length > 0) {
    checkable = true
    if (!names.some((e) => actualNames.some((a) => nameMatches(e, a)))) {
      reasons.push(`ชื่อผู้รับในสลิป "${actualNames[0]}" ไม่ตรงกับชื่อบัญชีที่ร้านตั้งไว้`)
    }
  }

  const accounts = channel.accounts.map((a) => a.trim()).filter(Boolean)
  const actualAccounts = [receiver.account, receiver.proxy].map((a) => a.trim()).filter(Boolean)
  if (accounts.length > 0 && actualAccounts.length > 0) {
    const results = accounts.flatMap((e) => actualAccounts.map((a) => accountMatches(e, a)))
    if (results.some((r) => r !== null)) {
      checkable = true
      if (!results.some((r) => r === true)) {
        reasons.push(`เลขบัญชี/พร้อมเพย์ผู้รับในสลิป "${actualAccounts[0]}" ไม่ตรงกับบัญชีที่ร้านตั้งไว้`)
      }
    }
  }

  if (!checkable) return { status: 'unknown', reasons }
  return { status: reasons.length === 0 ? 'match' : 'mismatch', reasons }
}

export function matchReceiver(receiver: SlipReceiver, expected: ExpectedReceiver): ReceiverMatchResult {
  const channels = expected.channels.filter(
    (c) => c.names.some((n) => n.trim() !== '') || c.accounts.some((a) => a.trim() !== ''),
  )
  if (channels.length === 0) return { checked: false, ok: true, reasons: [] }

  const evaluated = channels.map((c) => evaluateChannel(receiver, c))
  if (evaluated.some((e) => e.status === 'match')) return { checked: true, ok: true, reasons: [] }
  // มีบัญชีที่ owner กรอกไม่ครบจนเทียบไม่ได้ — ตัดทิ้งไม่ได้ว่าผู้รับไม่ใช่บัญชีนั้น จึงไม่ปฏิเสธ
  if (evaluated.some((e) => e.status === 'unknown')) return { checked: false, ok: true, reasons: [] }

  const reasons =
    evaluated.length === 1
      ? evaluated[0].reasons
      : [`ผู้รับในสลิป "${[receiver.displayName || receiver.name, receiver.account || receiver.proxy].filter(Boolean).join(' · ')}" ไม่ตรงกับบัญชีรับเงินใดเลยที่ร้านตั้งไว้ (${evaluated.length} บัญชี)`]
  return { checked: true, ok: false, reasons }
}

/** ชื่อธนาคารจากรหัส 3 หลักที่ SlipOK ส่งกลับ (รหัสตาม ธปท. ครบทุกธนาคารที่ SlipOK รองรับ) — ไม่รู้จักคืนรหัสเดิม */
const BANK_NAMES: Record<string, string> = {
  '002': 'ธนาคารกรุงเทพ',
  '004': 'ธนาคารกสิกรไทย',
  '006': 'ธนาคารกรุงไทย',
  '011': 'ธนาคารทหารไทยธนชาต (ttb)',
  '014': 'ธนาคารไทยพาณิชย์',
  '022': 'ธนาคารซีไอเอ็มบี ไทย',
  '024': 'ธนาคารยูโอบี',
  '025': 'ธนาคารกรุงศรีอยุธยา',
  '030': 'ธนาคารออมสิน',
  '033': 'ธนาคารอาคารสงเคราะห์',
  '034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
  '035': 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย (EXIM)',
  '066': 'ธนาคารอิสลามแห่งประเทศไทย',
  '067': 'ธนาคารทิสโก้',
  '069': 'ธนาคารเกียรตินาคินภัทร',
  '070': 'ธนาคารไอซีบีซี (ไทย)',
  '071': 'ธนาคารไทยเครดิต',
  '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
  '098': 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SME D Bank)',
}

export const bankNameOf = (code: string): string => BANK_NAMES[code] ?? code
